import React, { useState, useEffect } from 'react';
import { canvaApi, authApi, folderApi, designApi } from './services/api';
import FolderPanel from './components/FolderPanel';
import DesignGrid from './components/DesignGrid';
import ActionToolbar from './components/ActionToolbar';
import './App.css';
import { CanvaDesign, CanvaFolder } from './types/canva';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [allDesigns, setAllDesigns] = useState<any[]>([]);
  const [folderDesigns, setFolderDesigns] = useState<any[]>([]);
  const [selectedDesigns, setSelectedDesigns] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allFolders, setAllFolders] = useState<CanvaFolder[]>([]);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      setLoading(true);
      const userResponse = await canvaApi.getUser();
      setUser(userResponse.user);
      setIsAuthenticated(true);
      await loadAllDesigns();
    } catch (err) {
      console.log('User not authenticated, redirecting to OAuth...');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAllDesigns = async () => {
    try {
      setError(null);
      console.log('[App] Loading all designs...');
      const response = await canvaApi.getDesigns(50, 0);
      console.log('[App] All designs loaded:', response.items.length);
      setAllDesigns(response.items);
    } catch (err) {
      console.error('[App] Error loading designs:', err);
      setError('Failed to load designs. Please try again.');
    }
  };

  // Load all folders for tree/children logic
  const loadAllFolders = async () => {
    try {
      const response = await folderApi.getFolders();
      setAllFolders(response.items);
    } catch (err) {
      // handle error
    }
  };

  useEffect(() => {
    loadAllFolders();
  }, [refreshTrigger]);

  // Helper: check if a folder has children
  const hasChildren = (folderId: string) => {
    return allFolders.some(f => f.parent_id === folderId);
  };

  const loadFolderDesigns = async (folderId: string) => {
    try {
      setError(null);
      // If folder has children, fetch recursively
      const recursive = hasChildren(folderId);
      const response = await folderApi.getFolderDesigns(folderId, recursive);
      setFolderDesigns(response.items);
    } catch (err) {
      setError('Failed to load folder designs. Please try again.');
      setFolderDesigns([]);
    }
  };

  const handleLogin = () => {
    authApi.redirectToOAuth();
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setIsAuthenticated(false);
      setUser(null);
      setAllDesigns([]);
      setFolderDesigns([]);
      setSelectedDesigns(new Set());
      setSelectedFolderId(null);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleFolderSelect = async (folderId: string | null) => {
    console.log('[App] Folder selected:', folderId);
    setSelectedFolderId(folderId);
    // Clear design selection when changing folders
    setSelectedDesigns(new Set());
    
    if (folderId) {
      await loadFolderDesigns(folderId);
    } else {
      setFolderDesigns([]);
    }
  };

  const handleDesignSelect = (designId: string, selected: boolean) => {
    console.log('[App] Design selection changed:', designId, selected);
    if (selected) {
      setSelectedDesigns(prev => new Set(prev.add(designId)));
    } else {
      setSelectedDesigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(designId);
        return newSet;
      });
    }
  };

  const handleSelectAll = () => {
    const currentDesigns = selectedFolderId ? folderDesigns : allDesigns;
    setSelectedDesigns(new Set(currentDesigns.map(design => design.id)));
  };

  const handleDeselectAll = () => {
    setSelectedDesigns(new Set());
  };

  const handleMoveToFolder = async (designIds: string[], targetFolderId: string) => {
    if (designIds.length === 0) return;

    try {
      console.log(`[App] Moving ${designIds.length} designs to folder ${targetFolderId}`);
      
      await designApi.moveDesignsToFolder(designIds, targetFolderId);
      
      // Clear selection
      setSelectedDesigns(new Set());
      
      // Refresh designs and folders
      await loadAllDesigns();
      setRefreshTrigger(prev => prev + 1); // Trigger folder refresh
      
      console.log('[App] Designs moved successfully');
    } catch (err) {
      console.error('[App] Error moving designs:', err);
      setError('Failed to move designs. Please try again.');
    }
  };

  const handleRemoveFromFolder = async (designIds: string[]) => {
    if (designIds.length === 0 || !selectedFolderId) return;

    try {
      console.log(`[App] Removing ${designIds.length} designs from folder ${selectedFolderId}`);
      
      await designApi.removeDesignsFromFolder(designIds, selectedFolderId);
      
      // Clear selection
      setSelectedDesigns(new Set());
      
      // Refresh designs and folders
      await loadAllDesigns();
      setRefreshTrigger(prev => prev + 1); // Trigger folder refresh
      
      console.log('[App] Designs removed from folder successfully');
    } catch (err) {
      console.error('[App] Error removing designs from folder:', err);
      setError('Failed to remove designs from folder. Please try again.');
    }
  };

  // Get the current designs to display
  const currentDesigns = selectedFolderId ? folderDesigns : allDesigns;

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="auth-screen">
          <div className="auth-content">
            <h1>Design Manager</h1>
            <p>Connect your Canva account to manage your designs and folders</p>
            <button className="login-btn" onClick={handleLogin}>
              Connect with Canva
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Design Manager</h1>
          <div className="user-info">
            {user && (
              <span className="user-name">
                Welcome, {user.real_name || user.firstName || user.email || 'User'}
              </span>
            )}
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <main className="app-main">
        <FolderPanel
          selectedFolderId={selectedFolderId}
          onFolderSelect={handleFolderSelect}
          refreshTrigger={refreshTrigger}
        />
        
        <div className="content-area">
          <ActionToolbar
            selectedCount={selectedDesigns.size}
            totalCount={currentDesigns.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            selectedFolderId={selectedFolderId}
            selectedDesigns={Array.from(selectedDesigns)}
            onMoveDesigns={handleMoveToFolder}
            onRemoveFromFolder={handleRemoveFromFolder}
          />
          
          <DesignGrid
            designs={currentDesigns}
            selectedDesigns={selectedDesigns}
            onDesignSelect={handleDesignSelect}
            selectedFolderId={selectedFolderId}
          />
        </div>
      </main>
    </div>
  );
}

export default App;