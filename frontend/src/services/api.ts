import axios from 'axios';
import { CanvaDesign, CanvaFolder, PaginatedResponse } from '../types/canva';

const API_BASE_URL = '/api';

// Configure axios with base URL and credentials
const api = axios.create({
  baseURL: 'http://127.0.0.1:3001',
  withCredentials: true,
  timeout: 10000,
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`[API] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// A generic error handler for axios requests
const handleError = (error: unknown, context: string) => {
  console.error(`${context}:`, error);
  if (axios.isAxiosError(error) && error.response) {
    // Prioritize the detailed error message from the backend if it exists
    const message = error.response.data.details || error.response.data.error || `Failed to ${context.toLowerCase()}.`;
    throw new Error(message);
  }
  throw new Error(`An unexpected error occurred while trying to ${context.toLowerCase()}.`);
};

/**
 * Fetches a paginated list of all folders.
 */
export async function listFolders(continuation?: string): Promise<PaginatedResponse<CanvaFolder>> {
  try {
    const params = new URLSearchParams();
    if (continuation) {
      params.append('continuation', continuation);
    }
    const response = await axios.get<PaginatedResponse<CanvaFolder>>(`${API_BASE_URL}/folders/list-folders?${params.toString()}`);
    return response.data;
  } catch (error) {
    handleError(error, 'List folders');
    // The line below will not be reached due to handleError throwing an error, but it's required for type safety.
    return { items: [], hasMore: false };
  }
}

/**
 * Creates a new folder.
 */
export async function createFolder(name: string, description?: string, parent_id?: string | null): Promise<CanvaFolder> {
  try {
    const response = await axios.post<{ data: CanvaFolder }>(`${API_BASE_URL}/folders/create`, { name, description, parent_id });
    // The backend may wrap the new folder in a 'data' property
    return response.data.data || (response.data as unknown as CanvaFolder);
  } catch (error) {
    handleError(error, 'Create folder');
    throw error; // Re-throw after handling
  }
}

/**
 * Fetches a paginated list of designs.
 * Can be filtered by a folderId. If folderId is null, fetches all designs.
 */
export async function listDesigns(folderId: string | null, continuation?: string): Promise<PaginatedResponse<CanvaDesign>> {
  try {
    const params = new URLSearchParams();
    if (continuation) {
      params.append('continuation', continuation);
    }
    // Always fetch all designs, ignore folderId
    const endpoint = '/designs/list-designs';
    const response = await axios.get<PaginatedResponse<CanvaDesign>>(`${API_BASE_URL}${endpoint}?${params.toString()}`);
    return response.data;
  } catch (error) {
    handleError(error, `List designs`);
    return { items: [], hasMore: false };
  }
}

/**
 * Moves a design to a specified folder.
 */
export async function moveDesign(designId: string, folderId: string): Promise<{ success: boolean }> {
    try {
        const response = await axios.post<{ success: boolean }>(`${API_BASE_URL}/designs/${designId}/move`, { folderId });
        return response.data;
    } catch (error) {
        handleError(error, `Move design ${designId} to folder ${folderId}`);
        throw error;
    }
}

export interface FolderResponse {
  items: CanvaFolder[];
  hasMore: boolean;
  total: number;
}

export interface DesignResponse {
  items: CanvaDesign[];
  hasMore: boolean;
  total: number;
}

// Database-backed folder operations
export const folderApi = {
  // Get all folders from database
  async getFolders(): Promise<FolderResponse> {
    try {
      const response = await api.get('/v1/db/folders');
      console.log('[API] Folders response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Error fetching folders:', error);
      throw error;
    }
  },

  // Create a new folder in database
  async createFolder(name: string, description?: string, parent_id?: string | null): Promise<{ data: CanvaFolder }> {
    try {
      const response = await api.post('/v1/db/folders', { name, description, parent_id });
      console.log('[API] Folder created:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Error creating folder:', error);
      throw error;
    }
  },

  // Get designs in a specific folder (optionally recursive)
  async getFolderDesigns(folderId: string, recursive: boolean = false): Promise<DesignResponse> {
    try {
      const url = `/v1/db/folders/${folderId}/designs${recursive ? '?recursive=true' : ''}`;
      const response = await api.get(url);
      console.log('[API] Folder designs response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Error fetching folder designs:', error);
      throw error;
    }
  },

  // Add a design to a folder
  async addDesignToFolder(folderId: string, designId: string): Promise<{ success: boolean }> {
    try {
      const response = await api.post(`/v1/db/folders/${folderId}/designs`, { designId });
      console.log('[API] Design added to folder:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Error adding design to folder:', error);
      throw error;
    }
  },

  // Remove a design from a folder
  async removeDesignFromFolder(folderId: string, designId: string): Promise<{ success: boolean }> {
    try {
      const response = await api.delete(`/v1/db/folders/${folderId}/designs/${designId}`);
      console.log('[API] Design removed from folder:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Error removing design from folder:', error);
      throw error;
    }
  },

  // Update folder
  async updateFolder(folderId: string, updates: { name?: string; description?: string }): Promise<{ data: CanvaFolder }> {
    try {
      const response = await api.put(`/v1/db/folders/${folderId}`, updates);
      console.log('[API] Folder updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Error updating folder:', error);
      throw error;
    }
  },

  // Delete folder
  async deleteFolder(folderId: string): Promise<{ success: boolean }> {
    try {
      const response = await api.delete(`/v1/db/folders/${folderId}`);
      console.log('[API] Folder deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Error deleting folder:', error);
      throw error;
    }
  }
};

// Design management operations
export const designApi = {
  // Move selected designs to a folder
  async moveDesignsToFolder(designIds: string[], folderId: string): Promise<{ success: boolean }> {
    try {
      console.log('[API] Moving designs to folder:', { designIds, folderId });
      
      // Add each design to the folder
      const promises = designIds.map(designId => 
        folderApi.addDesignToFolder(folderId, designId)
      );
      
      await Promise.all(promises);
      console.log('[API] All designs moved successfully');
      
      return { success: true };
    } catch (error) {
      console.error('[API] Error moving designs to folder:', error);
      throw error;
    }
  },

  // Remove designs from current folder
  async removeDesignsFromFolder(designIds: string[], folderId: string): Promise<{ success: boolean }> {
    try {
      console.log('[API] Removing designs from folder:', { designIds, folderId });
      
      // Remove each design from the folder
      const promises = designIds.map(designId => 
        folderApi.removeDesignFromFolder(folderId, designId)
      );
      
      await Promise.all(promises);
      console.log('[API] All designs removed from folder successfully');
      
      return { success: true };
    } catch (error) {
      console.error('[API] Error removing designs from folder:', error);
      throw error;
    }
  }
};

// Legacy Canva API operations (keeping for backward compatibility)
export const canvaApi = {
  // Get all designs from Canva
  async getDesigns(limit = 50, offset = 0): Promise<DesignResponse> {
    try {
      const response = await api.get(`/api/designs?limit=${limit}&offset=${offset}`);
      console.log('[API] Designs response:', response.data);
      
      // Debug: Log the first design to see its structure
      if (response.data.items && response.data.items.length > 0) {
        console.log('[API] First design structure:', JSON.stringify(response.data.items[0], null, 2));
      }
      
      return response.data;
    } catch (error) {
      console.error('[API] Error fetching designs:', error);
      throw error;
    }
  },

  // Get user profile
  async getUser(): Promise<{ user: any }> {
    try {
      const response = await api.get('/api/user');
      console.log('[API] User response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Error fetching user:', error);
      throw error;
    }
  },

  // Get all folders from Canva (legacy - may not work)
  async getFolders(): Promise<FolderResponse> {
    try {
      const response = await api.get('/v1/folders');
      console.log('[API] Canva folders response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Error fetching Canva folders:', error);
      throw error;
    }
  }
};

// Authentication
export const authApi = {
  // Initiate OAuth flow
  redirectToOAuth() {
    window.location.href = 'http://127.0.0.1:3001/oauth/redirect';
  },

  // Logout
  async logout(): Promise<{ success: boolean }> {
    try {
      const response = await api.post('/api/logout');
      console.log('[API] Logout response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[API] Error logging out:', error);
      throw error;
    }
  }
};

export default api; 