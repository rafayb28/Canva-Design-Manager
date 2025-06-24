import React from 'react';
import { CanvaDesign } from '../types/canva';
import './DesignGrid.css';

interface DesignGridProps {
  designs: CanvaDesign[];
  selectedDesigns: Set<string>;
  onDesignSelect: (designId: string, selected: boolean) => void;
  selectedFolderId: string | null;
}

const DesignGrid: React.FC<DesignGridProps> = ({ 
  designs, 
  selectedDesigns, 
  onDesignSelect, 
  selectedFolderId 
}) => {
  const handleDesignClick = (designId: string) => {
    const isSelected = selectedDesigns.has(designId);
    onDesignSelect(designId, !isSelected);
  };

  const handleOpenInCanva = (designId: string) => {
    const editorUrl = `https://www.canva.com/design/${designId}/edit`;
    window.open(editorUrl, '_blank');
  };

  const getThumbnailUrl = (design: CanvaDesign): string | null => {
    // Try the new thumbnail object structure first
    if (design.thumbnail?.url) {
      return design.thumbnail.url;
    }
    // Fall back to legacy thumbnailUrl field
    if (design.thumbnailUrl) {
      return design.thumbnailUrl;
    }
    return null;
  };

  if (designs.length === 0) {
    return (
      <div className="design-grid">
        <div className="empty-state">
          <p>
            {selectedFolderId 
              ? 'No designs in this folder' 
              : 'No designs found'
            }
          </p>
          <p>Your designs will appear here once you create them in Canva</p>
        </div>
      </div>
    );
  }

  return (
    <div className="design-grid">
      <div className="design-grid-header">
        <h2>
          {selectedFolderId ? 'Folder Designs' : 'All Designs'}
        </h2>
        <span className="design-count">
          {designs.length} design{designs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="design-grid-content">
        {designs.map((design) => {
          const isSelected = selectedDesigns.has(design.id);
          const thumbnailUrl = getThumbnailUrl(design);
          
          return (
            <div
              key={design.id}
              className={`design-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleDesignClick(design.id)}
              style={{ position: 'relative' }}
            >
              {/* Open in Canva button */}
              <button
                className="open-in-canva-btn"
                title="Open in Canva"
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  zIndex: 2
                }}
                onClick={e => {
                  e.stopPropagation();
                  handleOpenInCanva(design.id);
                }}
              >
                {/* Simple SVG for open in new */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00b8d9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
              <div className="design-thumbnail">
                {thumbnailUrl ? (
                  <img 
                    src={thumbnailUrl} 
                    alt={design.title || 'Design thumbnail'}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const placeholder = target.nextElementSibling as HTMLElement;
                      if (placeholder) {
                        placeholder.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div className="placeholder-thumbnail" style={{ display: thumbnailUrl ? 'none' : 'flex' }}>
                  <span>No Preview</span>
                </div>
                {isSelected && (
                  <div className="selection-indicator">
                    <span>✓</span>
                  </div>
                )}
              </div>
              
              <div className="design-info">
                <h3 className="design-title">
                  {design.title || 'Untitled Design'}
                </h3>
                <div className="design-meta">
                  <span className="design-date">
                    {new Date(design.createdAt).toLocaleDateString()}
                  </span>
                  {design.type && (
                    <span className="design-type">{design.type}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DesignGrid; 