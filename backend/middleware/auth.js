const express = require('express');

// In-memory storage for tokens (in production, use a proper database)
const tokenStorage = new Map();

/**
 * Authentication middleware that:
 * 1. Extracts user_id from cookies
 * 2. Retrieves tokens from storage
 * 3. Injects tokens into request object
 * 4. Handles token refresh if needed
 */
const authenticateUser = (req, res, next) => {
  try {
    const userId = req.cookies?.user_id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tokens = tokenStorage.get(userId);
    if (!tokens) {
      res.clearCookie('user_id');
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Check if token is expired and needs refresh
    if (tokens.expires_at && Date.now() > tokens.expires_at) {
      // Token is expired, try to refresh
      return refreshToken(req, res, next, userId, tokens);
    }

    // Inject tokens into request object
    req.tokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in
    };
    req.user_id = userId;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Refresh token function
 */
async function refreshToken(req, res, next, userId, tokens) {
  try {
    if (!tokens.refresh_token) {
      // No refresh token available, user needs to re-authenticate
      tokenStorage.delete(userId);
      res.clearCookie('user_id');
      return res.status(401).json({ error: 'Session expired, please re-authenticate' });
    }

    const refreshResponse = await fetch(`${process.env.CANVA_API_BASE_URL}/rest/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.CANVA_CLIENT_ID,
        client_secret: process.env.CANVA_CLIENT_SECRET,
        refresh_token: tokens.refresh_token
      })
    });

    if (!refreshResponse.ok) {
      // Refresh failed, user needs to re-authenticate
      tokenStorage.delete(userId);
      res.clearCookie('user_id');
      return res.status(401).json({ error: 'Session expired, please re-authenticate' });
    }

    const newTokens = await refreshResponse.json();
    
    // Update stored tokens
    const updatedTokens = {
      ...newTokens,
      expires_at: Date.now() + (newTokens.expires_in * 1000)
    };
    tokenStorage.set(userId, updatedTokens);

    // Inject new tokens into request
    req.tokens = {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      expires_in: newTokens.expires_in
    };
    req.user_id = userId;

    console.log(`Successfully refreshed token for user ${userId}`);
    next();
  } catch (error) {
    console.error('Token refresh error:', error);
    tokenStorage.delete(userId);
    res.clearCookie('user_id');
    res.status(401).json({ error: 'Session expired, please re-authenticate' });
  }
}

/**
 * Store tokens for a user
 */
const storeTokens = (userId, tokens) => {
  const tokensWithExpiry = {
    ...tokens,
    expires_at: Date.now() + (tokens.expires_in * 1000)
  };
  tokenStorage.set(userId, tokensWithExpiry);
};

/**
 * Get tokens for a user
 */
const getTokens = (userId) => {
  return tokenStorage.get(userId);
};

/**
 * Remove tokens for a user (logout)
 */
const removeTokens = (userId) => {
  tokenStorage.delete(userId);
};

/**
 * Optional authentication middleware for endpoints that can work without auth
 */
const optionalAuth = (req, res, next) => {
  try {
    const userId = req.cookies?.user_id;
    
    if (userId) {
      const tokens = tokenStorage.get(userId);
      if (tokens) {
        req.tokens = {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in
        };
        req.user_id = userId;
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without authentication
  }
};

// This function will create a REAL API client that can make authenticated requests to Canva.
const getApiClient = (tokens) => {
  const authenticatedFetch = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Canva API Error (${response.status}):`, errorBody);
      throw new Error(`Canva API request failed with status ${response.status}`);
    }
    return response.json();
  };

  return {
    listDesigns: async () => {
      const url = `${process.env.CANVA_API_BASE_URL}/rest/v1/designs`;
      return authenticatedFetch(url);
    },
    // Add other real API methods here in the future
  };
};

const injectClient = (req, res, next) => {
  const userId = req.cookies.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const tokenStorage = req.app.get('tokenStorage');
  const tokens = tokenStorage.get(userId);
  if (!tokens) {
    res.clearCookie('user_id');
    return res.status(401).json({ error: 'Invalid session' });
  }

  // Inject the REAL client
  req.client = getApiClient(tokens);
  next();
};

module.exports = {
  authenticateUser,
  storeTokens,
  getTokens,
  removeTokens,
  optionalAuth,
  injectClient
}; 