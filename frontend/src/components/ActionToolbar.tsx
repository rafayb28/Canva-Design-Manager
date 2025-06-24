import React, { useState, useEffect } from 'react';
import { folderApi } from '../services/api';
import { CanvaFolder } from '../types/canva';
import './ActionToolbar.css';

interface ActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selectedFolderId: string | null;
  selectedDesigns: string[];
  onMoveDesigns: (designIds: string[], targetFolderId: string) => Promise<void>;
  onRemoveFromFolder: (designIds: string[]) => Promise<void>;
}

const ActionToolbar: React.FC<ActionToolbarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  selectedFolderId,
  selectedDesigns,
  onMoveDesigns,
  onRemoveFromFolder,
}) => {
  const [folders, setFolders] = useState<CanvaFolder[]>([]);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const hasSelection = selectedCount > 0;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  // Load folders for move dialog
  useEffect(() => {
    if (showMoveDialog) {
      loadFolders();
    }
  }, [showMoveDialog]);

  const loadFolders = async () => {
    try {
      const response = await folderApi.getFolders();
      // Filter out the current folder from the move options
      const availableFolders = response.items.filter(folder => folder.id !== selectedFolderId);
      setFolders(availableFolders);
      setTargetFolderId(availableFolders.length > 0 ? availableFolders[0].id : '');
    } catch (error) {
      console.error('Error loading folders for move dialog:', error);
    }
  };

  const handleMoveToFolder = async () => {
    if (!targetFolderId || selectedDesigns.length === 0) return;

    try {
      setIsMoving(true);
      await onMoveDesigns(selectedDesigns, targetFolderId);
      setShowMoveDialog(false);
      setTargetFolderId('');
    } catch (error) {
      console.error('Error moving designs:', error);
    } finally {
      setIsMoving(false);
    }
  };

  const handleRemoveFromFolder = async () => {
    if (selectedDesigns.length === 0 || !selectedFolderId) return;

    try {
      setIsRemoving(true);
      await onRemoveFromFolder(selectedDesigns);
    } catch (error) {
      console.error('Error removing designs from folder:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <div className="action-toolbar">
        <div className="toolbar-left">
          <div className="selection-info">
            {hasSelection ? (
              <span className="selected-count">
                {selectedCount} of {totalCount} selected
              </span>
            ) : (
              <span className="total-count">
                {totalCount} design{totalCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {totalCount > 0 && (
            <div className="selection-actions">
              {allSelected ? (
                <button className="action-btn" onClick={onDeselectAll}>
                  Deselect All
                </button>
              ) : (
                <button className="action-btn" onClick={onSelectAll}>
                  Select All
                </button>
              )}
            </div>
          )}
        </div>

        <div className="toolbar-right">
          {selectedFolderId && (
            <div className="folder-info">
              <span className="folder-label">Viewing folder</span>
            </div>
          )}
          
          {hasSelection && (
            <div className="bulk-actions">
              {selectedFolderId ? (
                <button 
                  className="action-btn danger" 
                  onClick={handleRemoveFromFolder}
                  disabled={isRemoving}
                >
                  {isRemoving ? 'Removing...' : 'Remove from Folder'}
                </button>
              ) : (
                <button 
                  className="action-btn primary" 
                  onClick={() => setShowMoveDialog(true)}
                >
                  Move to Folder
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Move to Folder Dialog */}
      {showMoveDialog && (
        <div className="modal-overlay" onClick={() => setShowMoveDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Move to Folder</h3>
            <p>Select a folder to move {selectedCount} design{selectedCount !== 1 ? 's' : ''} to:</p>
            
            <div className="form-group">
              <label htmlFor="targetFolder">Target Folder</label>
              <select
                id="targetFolder"
                value={targetFolderId}
                onChange={(e) => setTargetFolderId(e.target.value)}
                disabled={isMoving}
              >
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowMoveDialog(false)}
                disabled={isMoving}
              >
                Cancel
              </button>
              <button 
                onClick={handleMoveToFolder}
                disabled={isMoving || !targetFolderId}
                className="primary"
              >
                {isMoving ? 'Moving...' : 'Move Designs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActionToolbar; 