const express = require('express');
const router = express.Router();
const database = require('../database');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/**
 * GET /api/db/folders
 * List all folders from the database
 */
router.get('/', async (req, res) => {
  try {
    console.log('[DB FOLDERS] Fetching all folders from database');
    const folders = await database.getAllFolders();
    const mappings = await database.all('SELECT * FROM design_folder_mapping');
    // Build descendant map
    const getAllDescendants = getDescendantFolderIdsMap(folders);
    // Precompute design ids for each folder and its descendants
    const folderDesignCounts = {};
    folders.forEach(folder => {
      const descendantIds = getAllDescendants(folder.id);
      const allFolderIds = [folder.id, ...descendantIds];
      // Count unique design ids in this folder and all descendants
      const designIds = new Set();
      for (const m of mappings) {
        if (allFolderIds.includes(m.folder_id)) {
          designIds.add(m.design_id);
        }
      }
      folderDesignCounts[folder.id] = designIds.size;
    });
    // Attach designCount to each folder
    const foldersWithCount = folders.map(folder => ({
      ...folder,
      designCount: folderDesignCounts[folder.id] || 0
    }));
    const response = {
      items: foldersWithCount,
      hasMore: false,
      total: foldersWithCount.length
    };
    res.json(response);
  } catch (error) {
    console.error('[DB FOLDERS] Error fetching folders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch folders',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/db/folders
 * Create a new folder in the database
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, parent_id } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Folder name is required and must be a string.' });
    }

    // Generate a unique folder ID
    const folderId = 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    console.log('[DB FOLDERS] Creating folder:', { id: folderId, name, description, parent_id });
    
    const folderData = {
      id: folderId,
      name: name.trim(),
      description: description || null,
      parent_id: parent_id || null
    };
    
    const createdFolder = await database.createFolder(folderData);
    console.log('[DB FOLDERS] Folder created successfully:', createdFolder);
    
    res.status(201).json({ data: createdFolder });
  } catch (error) {
    console.error('[DB FOLDERS] Error creating folder:', error);
    res.status(500).json({
      error: 'Failed to create folder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/db/folders/:folderId
 * Get a specific folder by ID
 */
router.get('/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    console.log('[DB FOLDERS] Fetching folder:', folderId);
    
    const folder = await database.getFolder(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    // Get design count for this folder
    const designCount = await database.getDesignCountForFolder(folderId);
    const folderWithCount = { ...folder, designCount };
    
    res.json({ data: folderWithCount });
  } catch (error) {
    console.error('[DB FOLDERS] Error fetching folder:', error);
    res.status(500).json({ 
      error: 'Failed to fetch folder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/db/folders/:folderId
 * Update a folder
 */
router.put('/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name, description } = req.body;
    
    console.log('[DB FOLDERS] Updating folder:', folderId, { name, description });
    
    const folder = await database.getFolder(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const updatedFolder = await database.updateFolder(folderId, { name, description });
    console.log('[DB FOLDERS] Folder updated successfully:', updatedFolder);
    
    res.json({ data: updatedFolder });
  } catch (error) {
    console.error('[DB FOLDERS] Error updating folder:', error);
    res.status(500).json({
      error: 'Failed to update folder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/db/folders/:folderId
 * Delete a folder and all its design mappings
 */
router.delete('/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    console.log('[DB FOLDERS] Deleting folder:', folderId);
    
    const folder = await database.getFolder(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    await database.deleteFolder(folderId);
    console.log('[DB FOLDERS] Folder deleted successfully');
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DB FOLDERS] Error deleting folder:', error);
    res.status(500).json({
      error: 'Failed to delete folder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper: recursively get all descendant folder IDs (used for design count)
function getDescendantFolderIdsMap(folders) {
  const map = {};
  folders.forEach(folder => {
    map[folder.id] = [];
  });
  folders.forEach(folder => {
    if (folder.parent_id && map[folder.parent_id]) {
      map[folder.parent_id].push(folder.id);
    }
  });
  // Helper to get all descendants for a folder
  function getAllDescendants(id) {
    let result = [];
    for (const childId of map[id]) {
      result.push(childId);
      result = result.concat(getAllDescendants(childId));
    }
    return result;
  }
  return getAllDescendants;
}

/**
 * GET /api/db/folders/:folderId/designs
 * Get all designs in a specific folder (optionally recursively for all descendants)
 */
router.get('/:folderId/designs', async (req, res) => {
  try {
    const { folderId } = req.params;
    const recursive = req.query.recursive === 'true';
    console.log('[DB FOLDERS] Fetching designs for folder:', folderId, 'recursive:', recursive);
    
    // Check if folder exists
    const folder = await database.getFolder(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    let folderIds = [folderId];
    if (recursive) {
      // Get all folders to build the tree
      const allFolders = await database.getAllFolders();
      const getAllDescendants = getDescendantFolderIdsMap(allFolders);
      const descendantIds = getAllDescendants(folderId);
      folderIds = [folderId, ...descendantIds];
    }
    
    // Get design IDs in these folders
    let designIds = [];
    for (const fid of folderIds) {
      const ids = await database.getDesignsInFolder(fid);
      designIds.push(...ids);
    }
    // Remove duplicates
    designIds = [...new Set(designIds)];
    console.log(`[DB FOLDERS] Found ${designIds.length} designs in folders:`, folderIds);
    
    if (designIds.length === 0) {
      return res.json({ items: [], hasMore: false, total: 0 });
    }
    
    // Get full design details from Canva API
    const tokens = req.tokens;
    if (!tokens?.access_token) {
      return res.status(401).json({ error: 'Invalid session credentials' });
    }
    try {
      const canvaApiUrl = process.env.CANVA_API_BASE_URL || 'https://api.canva.com';
      const designsResponse = await fetch(
        `${canvaApiUrl}/rest/v1/designs?limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!designsResponse.ok) {
        const errorText = await designsResponse.text();
        return res.status(500).json({ error: 'Failed to fetch designs from Canva', details: errorText });
      }
      const allDesigns = (await designsResponse.json()).items || [];
      // Filter to only those in designIds
      const filteredDesigns = allDesigns.filter(d => designIds.includes(d.id));
      return res.json({ items: filteredDesigns, hasMore: false, total: filteredDesigns.length });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch designs from Canva', details: err.message });
    }
  } catch (error) {
    console.error('[DB FOLDERS] Error fetching folder designs:', error);
    res.status(500).json({ error: 'Failed to fetch folder designs', details: error.message });
  }
});

/**
 * POST /api/db/folders/:folderId/designs
 * Add a design to a folder
 */
router.post('/:folderId/designs', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { designId } = req.body;
    
    if (!designId) {
      return res.status(400).json({ error: 'Design ID is required' });
    }
    
    console.log('[DB FOLDERS] Adding design to folder:', { designId, folderId });
    
    // Check if folder exists
    const folder = await database.getFolder(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    await database.addDesignToFolder(designId, folderId);
    console.log('[DB FOLDERS] Design added to folder successfully');
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DB FOLDERS] Error adding design to folder:', error);
    res.status(500).json({
      error: 'Failed to add design to folder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/db/folders/:folderId/designs/:designId
 * Remove a design from a folder
 */
router.delete('/:folderId/designs/:designId', async (req, res) => {
  try {
    const { folderId, designId } = req.params;
    console.log('[DB FOLDERS] Removing design from folder:', { designId, folderId });
    
    await database.removeDesignFromFolder(designId, folderId);
    console.log('[DB FOLDERS] Design removed from folder successfully');
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DB FOLDERS] Error removing design from folder:', error);
    res.status(500).json({
      error: 'Failed to remove design from folder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 