# Canva File Manager - Backend API Endpoints

This document describes the modular backend endpoints for the Canva File Manager application. The backend provides a clean, RESTful API that connects to the Canva API with proper authentication, pagination, and error handling.

## Architecture Overview

The backend uses a modular Express.js architecture with:
- **Authentication Middleware**: Handles OAuth token management and user sessions
- **Route Modules**: Separate route files for different resource types
- **Standardized Responses**: Consistent API response format with pagination support

## Authentication

All API endpoints require authentication via OAuth 2.0 PKCE flow. The authentication middleware:
- Extracts user tokens from cookies
- Handles token refresh automatically
- Injects authenticated tokens into request objects
- Manages session expiration

## API Response Format

All endpoints return data in a standardized format:

### Paginated Response
```json
{
  "items": [...],
  "continuation": "next_page_token",
  "total": 150,
  "hasMore": true
}
```

### Single Item Response
```json
{
  "data": {...},
  "success": true
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional details (development only)"
}
```

## Folder Endpoints

### GET /api/folders/list-folders
List all folders with pagination support.

**Query Parameters:**
- `continuation` (optional): Token for pagination
- `limit` (optional): Number of items per page (default: 50)

**Response:**
```json
{
  "items": [
    {
      "id": "folder_123",
      "name": "My Projects",
      "description": "Personal design projects",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:45:00Z",
      "parentId": null,
      "designCount": 25,
      "owner": {
        "id": "user_456",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "continuation": "next_page_token",
  "hasMore": true,
  "total": 150
}
```

### GET /api/folders/:folderId
Get a specific folder by ID.

**Response:**
```json
{
  "data": {
    "id": "folder_123",
    "name": "My Projects",
    "description": "Personal design projects",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z",
    "parentId": null,
    "designCount": 25,
    "owner": {
      "id": "user_456",
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "success": true
}
```

### GET /api/folders/:folderId/contents
Get all designs within a specific folder.

**Query Parameters:**
- `continuation` (optional): Token for pagination
- `limit` (optional): Number of items per page (default: 50)

**Response:**
```json
{
  "items": [
    {
      "id": "design_789",
      "title": "Social Media Post",
      "thumbnailUrl": "https://example.com/thumbnail.jpg",
      "createdAt": "2024-01-18T09:15:00Z",
      "updatedAt": "2024-01-19T16:30:00Z",
      "type": "presentation",
      "status": "published",
      "owner": {
        "id": "user_456",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "continuation": "next_page_token",
  "hasMore": true
}
```

## Design Endpoints

### GET /api/designs/list-designs
List all designs with pagination and filtering support.

**Query Parameters:**
- `continuation` (optional): Token for pagination
- `limit` (optional): Number of items per page (default: 50)
- `folder_id` (optional): Filter designs by folder ID
- `type` (optional): Filter by design type
- `status` (optional): Filter by design status

**Response:**
```json
{
  "items": [
    {
      "id": "design_789",
      "title": "Social Media Post",
      "thumbnailUrl": "https://example.com/thumbnail.jpg",
      "createdAt": "2024-01-18T09:15:00Z",
      "updatedAt": "2024-01-19T16:30:00Z",
      "type": "presentation",
      "status": "published",
      "owner": {
        "id": "user_456",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "continuation": "next_page_token",
  "hasMore": true,
  "total": 75
}
```

### GET /api/designs/:designId
Get a specific design by ID.

**Response:**
```json
{
  "data": {
    "id": "design_789",
    "title": "Social Media Post",
    "thumbnailUrl": "https://example.com/thumbnail.jpg",
    "createdAt": "2024-01-18T09:15:00Z",
    "updatedAt": "2024-01-19T16:30:00Z",
    "type": "presentation",
    "status": "published",
    "owner": {
      "id": "user_456",
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "success": true
}
```

### POST /api/designs/:designId/duplicate
Duplicate a design.

**Response:**
```json
{
  "data": {
    "id": "design_790",
    "title": "Social Media Post (Copy)",
    "thumbnailUrl": "https://example.com/thumbnail.jpg",
    "createdAt": "2024-01-20T10:00:00Z",
    "updatedAt": "2024-01-20T10:00:00Z",
    "type": "presentation",
    "status": "draft",
    "owner": {
      "id": "user_456",
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "success": true
}
```

### DELETE /api/designs/:designId
Delete a design.

**Response:**
```json
{
  "success": true
}
```

### POST /api/designs/:designId/move
Move a design to a different folder.

**Request Body:**
```json
{
  "folderId": "folder_456"
}
```

**Response:**
```json
{
  "success": true
}
```

## Legacy Endpoints (Backward Compatibility)

The following endpoints are maintained for backward compatibility:

- `GET /api/user` - Get current user profile
- `GET /api/designs` - Legacy design listing (without pagination)
- `GET /api/assets` - Assets endpoint (returns empty array)
- `POST /api/logout` - Logout user

## Error Handling

The API provides comprehensive error handling:

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized (authentication required)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (Canva API issues)

### Error Response Format
```json
{
  "error": "Human-readable error message",
  "details": "Technical details (development only)"
}
```

## Pagination

All list endpoints support pagination using continuation tokens:

1. **First Request**: No continuation token needed
2. **Subsequent Requests**: Use the `continuation` token from the previous response
3. **Last Page**: `hasMore` will be `false` and no `continuation` token provided

**Example Pagination Flow:**
```javascript
// First page
const response1 = await fetch('/api/designs/list-designs?limit=10');
const data1 = await response1.json();
// data1.continuation contains token for next page

// Second page
const response2 = await fetch(`/api/designs/list-designs?limit=10&continuation=${data1.continuation}`);
const data2 = await response2.json();
// Continue until hasMore is false
```

## Usage Examples

### Frontend Integration

```javascript
// List folders with pagination
async function loadFolders(continuation = null) {
  const params = new URLSearchParams({ limit: '20' });
  if (continuation) params.append('continuation', continuation);
  
  const response = await fetch(`/api/folders/list-folders?${params}`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to load folders');
  }
  
  return response.json();
}

// List designs in a specific folder
async function loadFolderContents(folderId, continuation = null) {
  const params = new URLSearchParams({ limit: '20' });
  if (continuation) params.append('continuation', continuation);
  
  const response = await fetch(`/api/folders/${folderId}/contents?${params}`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to load folder contents');
  }
  
  return response.json();
}

// Duplicate a design
async function duplicateDesign(designId) {
  const response = await fetch(`/api/designs/${designId}/duplicate`, {
    method: 'POST',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to duplicate design');
  }
  
  return response.json();
}
```

## Development Notes

### Environment Variables
Ensure these environment variables are set:
- `CANVA_CLIENT_ID` - Your Canva app client ID
- `CANVA_CLIENT_SECRET` - Your Canva app client secret
- `CANVA_API_BASE_URL` - Canva API base URL (default: https://api.canva.com)
- `CANVA_AUTH_BASE_URL` - Canva auth base URL (default: https://www.canva.com)

### Running the Server
```bash
# Use the modular server
node server-modular.js

# Or use the original server
node server.js
```

### File Structure
```
backend/
├── middleware/
│   └── auth.js          # Authentication middleware
├── routes/
│   ├── folderRoutes.js  # Folder endpoints
│   └── designRoutes.js  # Design endpoints
server-modular.js        # Modular server with new endpoints
server.js               # Original server (legacy)
```

## Migration Guide

To migrate from the legacy endpoints to the new modular endpoints:

1. **Replace `/api/designs` with `/api/designs/list-designs`**
   - Add pagination support
   - Use continuation tokens instead of offset/limit

2. **Add folder support**
   - Use `/api/folders/list-folders` for folder listing
   - Use `/api/folders/:folderId/contents` for folder contents

3. **Update error handling**
   - Check for standardized error response format
   - Handle pagination properly

4. **Authentication remains the same**
   - OAuth flow unchanged
   - Cookie-based sessions maintained 