const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'data', 'canva_folders.db');
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const fs = require('fs');
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
          return;
        }
        console.log('Connected to SQLite database');
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  async createTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parent_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS design_folder_mapping (
        design_id TEXT NOT NULL,
        folder_id TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (design_id, folder_id),
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_design_folder_mapping_folder_id ON design_folder_mapping(folder_id)`,
      `CREATE INDEX IF NOT EXISTS idx_design_folder_mapping_design_id ON design_folder_mapping(design_id)`
    ];

    for (const query of queries) {
      await this.run(query);
    }
    console.log('Database tables created successfully');
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Database run error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Database get error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database all error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Folder operations
  async createFolder(folderData) {
    const { id, name, description, parent_id } = folderData;
    const sql = `INSERT OR REPLACE INTO folders (id, name, description, parent_id, updated_at) 
                  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    await this.run(sql, [id, name, description, parent_id || null]);
    return this.getFolder(id);
  }

  async getFolder(id) {
    const sql = `SELECT * FROM folders WHERE id = ?`;
    return this.get(sql, [id]);
  }

  async getAllFolders() {
    const sql = `SELECT f.*, 
                  (SELECT COUNT(*) FROM design_folder_mapping WHERE folder_id = f.id) as design_count
                  FROM folders f 
                  ORDER BY f.created_at DESC`;
    return this.all(sql);
  }

  async updateFolder(id, updates) {
    const { name, description } = updates;
    const sql = `UPDATE folders SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`;
    await this.run(sql, [name, description, id]);
    return this.getFolder(id);
  }

  async deleteFolder(id) {
    // This will cascade delete design mappings due to FOREIGN KEY constraint
    const sql = `DELETE FROM folders WHERE id = ?`;
    return this.run(sql, [id]);
  }

  // Design-Folder mapping operations
  async addDesignToFolder(designId, folderId) {
    const sql = `INSERT OR REPLACE INTO design_folder_mapping (design_id, folder_id) VALUES (?, ?)`;
    return this.run(sql, [designId, folderId]);
  }

  async removeDesignFromFolder(designId, folderId) {
    const sql = `DELETE FROM design_folder_mapping WHERE design_id = ? AND folder_id = ?`;
    return this.run(sql, [designId, folderId]);
  }

  async getDesignsInFolder(folderId) {
    const sql = `SELECT design_id FROM design_folder_mapping WHERE folder_id = ?`;
    const rows = await this.all(sql, [folderId]);
    return rows.map(row => row.design_id);
  }

  async getFolderForDesign(designId) {
    const sql = `SELECT folder_id FROM design_folder_mapping WHERE design_id = ?`;
    const row = await this.get(sql, [designId]);
    return row ? row.folder_id : null;
  }

  async getDesignCountForFolder(folderId) {
    const sql = `SELECT COUNT(*) as count FROM design_folder_mapping WHERE folder_id = ?`;
    const row = await this.get(sql, [folderId]);
    return row ? row.count : 0;
  }

  async close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }
}

// Create and export a singleton instance
const database = new Database();

module.exports = database; 