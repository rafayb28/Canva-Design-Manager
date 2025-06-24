const express = require('express');
const { injectClient } = require('../middleware/auth');

const router = express.Router();

router.get('/test-designs', injectClient, async (req, res) => {
  try {
    const canvaClient = req.client;

    if (!canvaClient || typeof canvaClient.listDesigns !== 'function') {
      console.error('CRITICAL: listDesigns function not available on the injected Canva client.');
      return res.status(500).json({ message: 'Canva client is not configured correctly on the server.' });
    }

    const response = await canvaClient.listDesigns();

    const designs = (response.items || []).map((d) => ({
      id: d.id,
      title: d.title,
      thumbnail: d.thumbnail, // Pass the thumbnail data to the frontend
    }));

    res.json(designs);
  } catch (error) {
    console.error('Failed to fetch real designs:', error);
    res.status(500).json({ message: 'A server error occurred while fetching designs from Canva.' });
  }
});

module.exports = router; 