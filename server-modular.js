const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
require('dotenv').config();

// Import database
const database = require('./backend/database');

// Import modular routes
const folderRoutes = require('./backend/routes/folderRoutes');
const designRoutes = require('./backend/routes/designRoutes');
const dbFolderRoutes = require('./backend/routes/dbFolderRoutes');

// Import authentication middleware
const { authenticateUser, storeTokens, removeTokens } = require('./backend/middleware/auth');

// Debug environment variables
console.log('Environment variables loaded:');
console.log('CANVA_CLIENT_ID:', process.env.CANVA_CLIENT_ID ? 'Set' : 'Missing');
console.log('CANVA_CLIENT_SECRET:', process.env.CANVA_CLIENT_SECRET ? 'Set' : 'Missing');
console.log('CANVA_API_BASE_URL:', process.env.CANVA_API_BASE_URL);
console.log('CANVA_AUTH_BASE_URL:', process.env.CANVA_AUTH_BASE_URL);
console.log('PORT:', process.env.PORT);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database before starting server
async function startServer() {
  try {
    console.log('Initializing database...');
    await database.init();
    console.log('Database initialized successfully');

    // Middleware
    app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://127.0.0.1:3000',
      credentials: true
    }));
    app.use(express.json());
    app.use(cookieParser());

    // OAuth endpoints (keeping existing implementation)
    app.get('/oauth/redirect', (req, res) => {
      const clientId = process.env.CANVA_CLIENT_ID;
      const redirectUri = `${req.protocol}://${req.get('host')}/oauth/callback`;
      
      console.log('OAuth redirect initiated');
      console.log('Client ID:', clientId ? 'Set' : 'Missing');
      console.log('Redirect URI:', redirectUri);
      
      if (!clientId) {
        return res.status(500).json({ error: 'CANVA_CLIENT_ID not configured' });
      }

      // Generate PKCE challenge
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      // Generate state for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');

      // Store PKCE verifier and state in cookies
      res.cookie('code_verifier', codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000 // 10 minutes
      });

      res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000 // 10 minutes
      });

      // Build authorization URL
      const authUrl = new URL('/api/oauth/authorize', process.env.CANVA_AUTH_BASE_URL);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'folder:write design:content:read design:meta:read asset:read asset:write profile:read');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      console.log('Redirecting to Canva:', authUrl.toString());
      res.redirect(authUrl.toString());
    });

    app.get('/oauth/callback', async (req, res) => {
      const { code, state, error } = req.query;

      console.log('OAuth callback received');
      console.log('Code:', code ? 'Present' : 'Missing');
      console.log('State:', state ? 'Present' : 'Missing');
      console.log('Error:', error || 'None');

      if (error) {
        console.log('OAuth error:', error);
        return res.redirect(`http://127.0.0.1:3000?error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        console.log('Missing code or state');
        return res.redirect(`http://127.0.0.1:3000?error=${encodeURIComponent('Missing authorization code or state')}`);
      }

      // Verify state
      const storedState = req.cookies.oauth_state;
      if (state !== storedState) {
        console.log('State mismatch');
        return res.redirect(`http://127.0.0.1:3000?error=${encodeURIComponent('Invalid state parameter')}`);
      }

      const codeVerifier = req.cookies.code_verifier;
      if (!codeVerifier) {
        console.log('Missing code verifier');
        return res.redirect(`http://127.0.0.1:3000?error=${encodeURIComponent('Missing code verifier')}`);
      }

      try {
        console.log('Exchanging code for tokens...');
        // Exchange code for tokens
        const tokenResponse = await fetch(`${process.env.CANVA_API_BASE_URL}/rest/v1/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: process.env.CANVA_CLIENT_ID,
            client_secret: process.env.CANVA_CLIENT_SECRET,
            code: code,
            redirect_uri: `${req.protocol}://${req.get('host')}/oauth/callback`,
            code_verifier: codeVerifier
          })
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Token exchange failed:', errorText);
          return res.redirect(`http://127.0.0.1:3000?error=${encodeURIComponent('Token exchange failed')}`);
        }

        const tokens = await tokenResponse.json();
        console.log('Token exchange successful');
        
        // Store tokens using the modular auth system
        const userId = 'user_' + crypto.randomBytes(16).toString('hex');
        storeTokens(userId, tokens);

        // Set user cookie
        res.cookie('user_id', userId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Clear OAuth cookies
        res.clearCookie('code_verifier');
        res.clearCookie('oauth_state');

        console.log('Redirecting to frontend with success');
        res.redirect(`http://127.0.0.1:3000?success=true&userId=${userId}`);

      } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect(`http://127.0.0.1:3000?error=${encodeURIComponent('Authorization failed')}`);
      }
    });

    // Legacy API endpoints (keeping for backward compatibility)
    app.get('/api/user', async (req, res) => {
      const userId = req.cookies.user_id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tokens = require('./backend/middleware/auth').getTokens(userId);
      if (!tokens) {
        res.clearCookie('user_id');
        return res.status(401).json({ error: 'Invalid session' });
      }

      try {
        const userResponse = await fetch(`${process.env.CANVA_API_BASE_URL}/rest/v1/users/me`, {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`
          }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const user = await userResponse.json();
        res.json({ user });
      } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
      }
    });

    app.get('/api/designs', async (req, res) => {
      const userId = req.cookies.user_id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tokens = require('./backend/middleware/auth').getTokens(userId);
      if (!tokens) {
        res.clearCookie('user_id');
        return res.status(401).json({ error: 'Invalid session' });
      }

      try {
        const limit = req.query.limit || 50;
        const offset = req.query.offset || 0;

        const designsResponse = await fetch(
          `${process.env.CANVA_API_BASE_URL}/rest/v1/designs?limit=${limit}&offset=${offset}`,
          {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`
            }
          }
        );

        if (!designsResponse.ok) {
          const errorText = await designsResponse.text();
          console.error('Designs API error response:', errorText);
          console.error('Designs API status:', designsResponse.status);
          throw new Error(`Failed to fetch designs: ${designsResponse.status} ${errorText}`);
        }

        const designs = await designsResponse.json();
        res.json(designs);
      } catch (error) {
        console.error('Error fetching designs:', error);
        res.status(500).json({ error: 'Failed to fetch designs' });
      }
    });

    app.get('/api/assets', async (req, res) => {
      const userId = req.cookies.user_id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tokens = require('./backend/middleware/auth').getTokens(userId);
      if (!tokens) {
        res.clearCookie('user_id');
        return res.status(401).json({ error: 'Invalid session' });
      }

      // Temporarily return empty assets array since the endpoint doesn't exist
      res.json({ assets: [] });
    });

    app.post('/api/logout', (req, res) => {
      const userId = req.cookies.user_id;
      if (userId) {
        removeTokens(userId);
      }
      res.clearCookie('user_id');
      res.json({ success: true });
    });

    // Modular API routes with authentication middleware
    app.use('/api/folders', authenticateUser, folderRoutes);
    app.use('/api/db/folders', authenticateUser, dbFolderRoutes);
    // Alias for frontend compatibility:
    app.get('/v1/folders', authenticateUser, (req, res, next) => {
      req.url = '/list-folders' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
      folderRoutes.handle(req, res, next);
    });
    app.use('/api/designs', authenticateUser, designRoutes);

    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Serve static files for frontend
    app.use(express.static('public'));

    // Serve the main HTML file
    app.get('/', (req, res) => {
      res.sendFile(__dirname + '/public/index.html');
    });

    app.post('/v1/folders', authenticateUser, (req, res, next) => {
      req.url = '/create';
      folderRoutes.handle(req, res, next);
    });

    // Database-backed folder aliases for frontend compatibility
    app.get('/v1/db/folders', authenticateUser, (req, res, next) => {
      req.url = '/' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
      dbFolderRoutes.handle(req, res, next);
    });
    
    app.get('/v1/db/folders/:folderId', authenticateUser, (req, res, next) => {
      req.url = '/' + req.params.folderId + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
      dbFolderRoutes.handle(req, res, next);
    });
    
    app.get('/v1/db/folders/:folderId/designs', authenticateUser, (req, res, next) => {
      req.url = '/' + req.params.folderId + '/designs' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
      dbFolderRoutes.handle(req, res, next);
    });
    
    app.post('/v1/db/folders', authenticateUser, (req, res, next) => {
      req.url = '/' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
      dbFolderRoutes.handle(req, res, next);
    });

    app.post('/v1/db/folders/:folderId/designs', authenticateUser, (req, res, next) => {
      req.url = '/' + req.params.folderId + '/designs' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
      dbFolderRoutes.handle(req, res, next);
    });

    app.delete('/v1/db/folders/:folderId/designs/:designId', authenticateUser, (req, res, next) => {
      req.url = '/' + req.params.folderId + '/designs/' + req.params.designId + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
      dbFolderRoutes.handle(req, res, next);
    });

    app.put('/v1/db/folders/:folderId', authenticateUser, (req, res, next) => {
      req.url = '/' + req.params.folderId + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
      dbFolderRoutes.handle(req, res, next);
    });

    app.delete('/v1/db/folders/:folderId', authenticateUser, (req, res, next) => {
      req.url = '/' + req.params.folderId + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
      dbFolderRoutes.handle(req, res, next);
    });

    app.listen(PORT, () => {
      console.log(`🚀 Canva Connect API server running on port ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://127.0.0.1:3000'}`);
      console.log(`🔗 Canva API URL: ${process.env.CANVA_API_BASE_URL || 'https://api.canva.com'}`);
      console.log(`📁 Modular routes enabled: /api/folders, /api/designs`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer(); 