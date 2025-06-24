const express = require('express');
const router = express.Router();

/**
 * GET /api/folders
 * List folders with pagination support
 * 
 * Query Parameters:
 * - continuation: Optional continuation token for pagination
 * - limit: Optional limit for number of items per page (default: 50)
 * 
 * Response: PaginatedResponse<CanvaFolder>
 */
router.get('/list-folders', async (req, res) => {
  try {
    const continuation = req.query.continuation;
    const limit = parseInt(req.query.limit) || 50;

    // The `authenticateUser` middleware has already run and attached tokens.
    const tokens = req.tokens;
    if (!tokens?.access_token) {
      // This case should theoretically not be reached if authenticateUser is working.
      return res.status(401).json({ error: 'Invalid session credentials' });
    }

    // Build query parameters for Canva API
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    
    if (continuation) {
      queryParams.append('continuation', continuation);
    }

    // Call Canva API to list folders
    const canvaApiUrl = process.env.CANVA_API_BASE_URL || 'https://api.canva.com';
    const folderResponse = await fetch(
      `${canvaApiUrl}/rest/v1/folders?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!folderResponse.ok) {
      const errorText = await folderResponse.text();
      console.error('Canva folders API error:', {
        status: folderResponse.status,
        statusText: folderResponse.statusText,
        error: errorText
      });
      
      // Handle specific error cases
      if (folderResponse.status === 401) {
        res.clearCookie('user_id');
        return res.status(401).json({ error: 'Authentication expired' });
      }
      
      if (folderResponse.status === 404) {
        // Folders endpoint might not exist in current Canva API
        // Return empty response with proper structure
        const emptyResponse = {
          items: [],
          hasMore: false
        };
        return res.json(emptyResponse);
      }
      
      throw new Error(`Canva API error: ${folderResponse.status} ${errorText}`);
    }

    const canvaResponse = await folderResponse.json();
    
    // Transform Canva API response to our standard format
    const transformedFolders = (canvaResponse.folders || canvaResponse.items || []).map((folder) => ({
      id: folder.id,
      name: folder.name || folder.title,
      description: folder.description,
      createdAt: folder.created_at || folder.createdAt,
      updatedAt: folder.updated_at || folder.updatedAt,
      parentId: folder.parent_id || folder.parentId,
      designCount: folder.design_count || folder.designCount,
      owner: folder.owner ? {
        id: folder.owner.id,
        name: folder.owner.name,
        email: folder.owner.email
      } : undefined
    }));

    // Extract pagination information
    const nextContinuation = canvaResponse.continuation || canvaResponse.next_continuation;
    const hasMore = Boolean(nextContinuation);
    const total = canvaResponse.total || canvaResponse.total_count;

    // Build the standardized response
    const response = {
      items: transformedFolders,
      hasMore,
      total
    };

    // Add continuation token if there are more items
    if (nextContinuation) {
      response.continuation = nextContinuation;
    }

    console.log(`Successfully fetched ${transformedFolders.length} folders${hasMore ? ' (more available)' : ''}`);
    res.json(response);

  } catch (error) {
    console.error('Error in folder listing endpoint:', error);
    
    // Provide meaningful error messages
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return res.status(503).json({ 
          error: 'Canva API is currently unavailable',
          details: error.message 
        });
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch folders',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/folders/:folderId
 * Get a specific folder by ID
 */
router.get('/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.cookies?.user_id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tokens = req.tokens;
    if (!tokens?.access_token) {
      res.clearCookie('user_id');
      return res.status(401).json({ error: 'Invalid session' });
    }

    const canvaApiUrl = process.env.CANVA_API_BASE_URL || 'https://api.canva.com';
    const folderResponse = await fetch(
      `${canvaApiUrl}/rest/v1/folders/${folderId}`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!folderResponse.ok) {
      if (folderResponse.status === 404) {
        return res.status(404).json({ error: 'Folder not found' });
      }
      throw new Error(`Canva API error: ${folderResponse.status}`);
    }

    const folder = await folderResponse.json();
    
    // Transform to our format
    const transformedFolder = {
      id: folder.id,
      name: folder.name || folder.title,
      description: folder.description,
      createdAt: folder.created_at || folder.createdAt,
      updatedAt: folder.updated_at || folder.updatedAt,
      parentId: folder.parent_id || folder.parentId,
      designCount: folder.design_count || folder.designCount,
      owner: folder.owner ? {
        id: folder.owner.id,
        name: folder.owner.name,
        email: folder.owner.email
      } : undefined
    };

    res.json({ data: transformedFolder, success: true });

  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ 
      error: 'Failed to fetch folder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/folders/:folderId/contents
 * Get contents of a specific folder (designs within the folder)
 */
router.get('/:folderId/contents', async (req, res) => {
  try {
    const { folderId } = req.params;
    const continuation = req.query.continuation;
    const limit = parseInt(req.query.limit) || 50;
    
    console.log(`[FOLDER CONTENTS] Fetching contents for folder: ${folderId}`);
    
    const userId = req.cookies?.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tokens = req.tokens;
    if (!tokens?.access_token) {
      res.clearCookie('user_id');
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    queryParams.append('folder_id', folderId);
    
    if (continuation) {
      queryParams.append('continuation', continuation);
    }

    const canvaApiUrl = process.env.CANVA_API_BASE_URL || 'https://api.canva.com';
    const fullUrl = `${canvaApiUrl}/rest/v1/designs?${queryParams.toString()}`;
    console.log(`[FOLDER CONTENTS] Calling Canva API: ${fullUrl}`);
    
    const designsResponse = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!designsResponse.ok) {
      const errorText = await designsResponse.text();
      console.error('Canva folder contents API error:', {
        status: designsResponse.status,
        error: errorText
      });
      
      if (designsResponse.status === 404) {
        console.log(`[FOLDER CONTENTS] Canva API returned 404, returning empty folder`);
        return res.json({ items: [], hasMore: false });
      }
      
      throw new Error(`Canva API error: ${designsResponse.status} ${errorText}`);
    }

    const canvaResponse = await designsResponse.json();
    console.log(`[FOLDER CONTENTS] Canva API response:`, canvaResponse);
    
    // Transform designs to our format
    const transformedDesigns = (canvaResponse.designs || canvaResponse.items || []).map((design) => ({
      id: design.id,
      title: design.title || design.name,
      thumbnailUrl: design.thumbnail_url || design.thumbnailUrl,
      createdAt: design.created_at || design.createdAt,
      updatedAt: design.updated_at || design.updatedAt,
      type: design.type,
      status: design.status,
      owner: design.owner ? {
        id: design.owner.id,
        name: design.owner.name,
        email: design.owner.email
      } : undefined
    }));

    const nextContinuation = canvaResponse.continuation || canvaResponse.next_continuation;
    const hasMore = Boolean(nextContinuation);

    const response = {
      items: transformedDesigns,
      hasMore
    };

    if (nextContinuation) {
      response.continuation = nextContinuation;
    }

    console.log(`[FOLDER CONTENTS] Successfully fetched ${transformedDesigns.length} designs from folder ${folderId}`);
    res.json(response);

  } catch (error) {
    console.error('Error fetching folder contents:', error);
    res.status(500).json({ 
      error: 'Failed to fetch folder contents',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/folders/create
 * Creates a new folder.
 */
router.post('/create', async (req, res) => {
  try {
    const { name } = req.body;
    const tokens = req.tokens;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Folder name is required and must be a string.' });
    }

    if (!tokens?.access_token) {
      return res.status(401).json({ error: 'Invalid session credentials' });
    }

    const canvaApiUrl = process.env.CANVA_API_BASE_URL || 'https://api.canva.com';
    const createResponse = await fetch(`${canvaApiUrl}/rest/v1/folders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, parent_folder_id: 'root' }),
    });

    if (!createResponse.ok) {
      const errorDetails = await createResponse.json().catch(() => createResponse.text());
      console.error('Canva create folder API error:', { status: createResponse.status, details: errorDetails });
      throw new Error(`Canva API error: ${createResponse.status} - ${JSON.stringify(errorDetails)}`);
    }

    const newFolderData = await createResponse.json();

    // Transform the Canva API response to our standard format
    const transformedFolder = {
      id: newFolderData.folder.id,
      name: newFolderData.folder.name,
      description: newFolderData.folder.description,
      createdAt: newFolderData.folder.created_at,
      updatedAt: newFolderData.folder.updated_at,
      parentId: newFolderData.folder.parent_id,
      designCount: newFolderData.folder.design_count || 0,
    };
    
    res.status(201).json({ data: transformedFolder });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      error: 'Failed to create folder',
      // Pass the specific error message to the frontend for diagnosis
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.use((req, res, next) => {
  console.log(`[FOLDER ROUTE] ${req.method} ${req.originalUrl} user_id: ${req.cookies.user_id}`);
  next();
});

module.exports = router; 