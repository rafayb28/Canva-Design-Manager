const express = require('express');
const router = express.Router();

/**
 * GET /api/designs/list-designs
 * List all designs with pagination and filtering support.
 */
router.get('/list-designs', async (req, res) => {
  try {
    const { continuation, limit: queryLimit, folder_id, type, status } = req.query;
    const limit = parseInt(queryLimit) || 50;
    const tokens = req.tokens;

    if (!tokens?.access_token) {
      return res.status(401).json({ error: 'Invalid session credentials' });
    }

    const queryParams = new URLSearchParams({ limit: limit.toString() });
    if (continuation) queryParams.append('continuation', continuation);
    if (folder_id) queryParams.append('folder_id', folder_id);
    if (type) queryParams.append('type', type);
    if (status) queryParams.append('status', status);

    const canvaApiUrl = process.env.CANVA_API_BASE_URL || 'https://api.canva.com';
    const designsResponse = await fetch(
      `${canvaApiUrl}/rest/v1/designs?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!designsResponse.ok) {
      const errorText = await designsResponse.text();
      console.error('Canva designs API error:', { status: designsResponse.status, error: errorText });
      throw new Error(`Canva API error: ${designsResponse.status}`);
    }

    const canvaResponse = await designsResponse.json();

    // Log the raw Canva response for debugging
    console.log('[DESIGN ROUTES] Raw Canva response:', JSON.stringify(canvaResponse, null, 2));

    // Transform the Canva API response to our standard format
    const transformedResponse = {
      ...canvaResponse,
      items: (canvaResponse.items || []).map((design) => {
        console.log('[DESIGN ROUTES] Processing design:', design.id, 'thumbnail:', design.thumbnail);
        
        return {
          id: design.id,
          title: design.title,
          thumbnail: design.thumbnail, // Preserve original thumbnail structure
          thumbnailUrl: design.thumbnail?.url, // Also provide legacy field for compatibility
          createdAt: design.created_at,
          updatedAt: design.updated_at,
          type: design.type,
          status: design.status,
        };
      }),
    };

    console.log('[DESIGN ROUTES] Transformed response:', JSON.stringify(transformedResponse, null, 2));
    res.json(transformedResponse);
  } catch (error) {
    console.error('Error in design listing endpoint:', error);
    res.status(500).json({
      error: 'Failed to fetch designs',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/designs/:designId/move
 * Move a design to a different folder.
 */
router.post('/:designId/move', async (req, res) => {
  try {
    const { designId } = req.params;
    const { folderId } = req.body;
    const tokens = req.tokens;

    if (!folderId) {
      return res.status(400).json({ error: 'folderId is required.' });
    }
    
    if (!tokens?.access_token) {
      return res.status(401).json({ error: 'Invalid session credentials' });
    }

    const canvaApiUrl = process.env.CANVA_API_BASE_URL || 'https://api.canva.com';
    const moveResponse = await fetch(
      `${canvaApiUrl}/rest/v1/designs/${designId}/folder`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder_id: folderId }),
      }
    );

    if (!moveResponse.ok) {
      const errorDetails = await moveResponse.json().catch(() => moveResponse.text());
      console.error('Canva move design API error:', { status: moveResponse.status, details: errorDetails });
      throw new Error(`Canva API error: ${moveResponse.status} - ${JSON.stringify(errorDetails)}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error moving design:', error);
    res.status(500).json({
      error: 'Failed to move design',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

module.exports = router;