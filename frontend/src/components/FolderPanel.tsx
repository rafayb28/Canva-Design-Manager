import React, { useState, useEffect } from 'react';
import { folderApi } from '../services/api';
import { CanvaFolder } from '../types/canva';
import './FolderPanel.css';

interface FolderPanelProps {
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  refreshTrigger?: number;
}

// Helper: build a tree from flat folder list
function buildFolderTree(folders: CanvaFolder[]): any[] {
  const map: Record<string, any> = {};
  const roots: any[] = [];
  folders.forEach(folder => {
    map[folder.id] = { ...folder, children: [] };
  });
  folders.forEach(folder => {
    if (folder.parent_id && map[folder.parent_id]) {
      map[folder.parent_id].children.push(map[folder.id]);
    } else {
      roots.push(map[folder.id]);
    }
  });
  return roots;
}

const FolderPanel: React.FC<FolderPanelProps> = ({ selectedFolderId, onFolderSelect, refreshTrigger = 0 }) => {
  const [folders, setFolders] = useState<CanvaFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [parentForNewFolder, setParentForNewFolder] = useState<string | null>(null);

  // Load folders on component mount and when refreshTrigger changes
  useEffect(() => {
    loadFolders();
  }, [refreshTrigger]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[FolderPanel] Loading folders...');
      
      const response = await folderApi.getFolders();
      console.log('[FolderPanel] Folders loaded:', response.items);
      
      setFolders(response.items);
    } catch (err) {
      console.error('[FolderPanel] Error loading folders:', err);
      setError('Failed to load folders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDialog = (parentId: string | null = null) => {
    setParentForNewFolder(parentId);
    setShowCreateDialog(true);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      setError('Folder name is required');
      return;
    }
    try {
      setCreating(true);
      setError(null);
      const response = await folderApi.createFolder(
        newFolderName.trim(),
        newFolderDescription.trim() || undefined,
        parentForNewFolder
      );
      setFolders(prev => [response.data, ...prev]);
      setNewFolderName('');
      setNewFolderDescription('');
      setShowCreateDialog(false);
      setParentForNewFolder(null);
      onFolderSelect(response.data.id);
    } catch (err) {
      setError('Failed to create folder. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleFolderClick = (folderId: string) => {
    console.log('[FolderPanel] Folder selected:', folderId);
    onFolderSelect(folderId === selectedFolderId ? null : folderId);
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('[FolderPanel] Deleting folder:', folderId);
      await folderApi.deleteFolder(folderId);
      
      // Remove folder from list
      setFolders(prev => prev.filter(folder => folder.id !== folderId));
      
      // If the deleted folder was selected, clear selection
      if (selectedFolderId === folderId) {
        onFolderSelect(null);
      }
      
      console.log('[FolderPanel] Folder deleted successfully');
    } catch (err) {
      console.error('[FolderPanel] Error deleting folder:', err);
      setError('Failed to delete folder. Please try again.');
    }
  };

  // Render folder tree recursively
  const renderFolderTree = (nodes: any[], level = 0) => (
    <div className="folder-tree">
      {nodes.map((folder: any) => (
        <div key={folder.id} style={{ marginLeft: level * 18 }}>
          <div
            className={`folder-item ${selectedFolderId === folder.id ? 'selected' : ''}`}
            onClick={() => handleFolderClick(folder.id)}
          >
            <div className="folder-info">
              <div className="folder-name">{folder.name}</div>
              {folder.description && (
                <div className="folder-description">{folder.description}</div>
              )}
              <div className="folder-meta">
                <span className="design-count">
                  {folder.designCount || 0} design{folder.designCount !== 1 ? 's' : ''}
                </span>
                {folder.created_at && (
                  <span className="created-date">
                    {new Date(folder.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button
              className="add-subfolder-btn"
              title="Add subfolder"
              onClick={e => { e.stopPropagation(); handleOpenCreateDialog(folder.id); }}
            >
              +
            </button>
            <button
              className="delete-folder-btn"
              onClick={e => handleDeleteFolder(folder.id, e)}
              title="Delete folder"
            >
              ×
            </button>
          </div>
          {folder.children && folder.children.length > 0 && renderFolderTree(folder.children, level + 1)}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="folder-panel">
        <div className="folder-panel-header">
          <h3>Folders</h3>
          <button 
            className="create-folder-btn" 
            onClick={() => setShowCreateDialog(true)}
            disabled
          >
            + New Folder
          </button>
        </div>
        <div className="folder-panel-content">
          <div className="loading">Loading folders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="folder-panel">
      <div className="folder-panel-header">
        <h3>Folders ({folders.length})</h3>
        <button 
          className="create-folder-btn" 
          onClick={() => setShowCreateDialog(true)}
        >
          + New Folder
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="folder-panel-content">
        {folders.length === 0 ? (
          <div className="empty-state">
            <p>No folders yet</p>
            <p>Create your first folder to organize your designs</p>
          </div>
        ) : (
          renderFolderTree(buildFolderTree(folders))
        )}
      </div>

      {/* Create Folder Dialog (parent_id support) */}
      {showCreateDialog && (
        <div className="modal-overlay" onClick={() => { setShowCreateDialog(false); setParentForNewFolder(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{parentForNewFolder ? 'Create Subfolder' : 'Create New Folder'}</h3>
            <form onSubmit={handleCreateFolder}>
              <div className="form-group">
                <label htmlFor="folderName">Folder Name *</label>
                <input
                  id="folderName"
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="folderDescription">Description</label>
                <input
                  id="folderDescription"
                  type="text"
                  value={newFolderDescription}
                  onChange={e => setNewFolderDescription(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowCreateDialog(false); setParentForNewFolder(null); }}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={creating}>
                  {creating ? 'Creating...' : parentForNewFolder ? 'Create Subfolder' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderPanel; 