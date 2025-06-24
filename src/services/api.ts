import axios from 'axios';
import { CanvaDesign, CanvaFolder, PaginatedResponse } from '../types/canva';

const API_BASE = '/api';

export async function listDesigns(): Promise<CanvaDesign[]> {
  try {
    const res = await axios.get(`${API_BASE}/test-designs`);
    return res.data;
  } catch (error) {
    throw new Error('Failed to fetch designs');
  }
}

// Stubs for folders, not used in minimal test
export async function listFolders(): Promise<CanvaFolder[]> {
  return [];
}

export async function createFolder(name: string): Promise<CanvaFolder> {
  throw new Error('Not implemented');
}

export async function moveDesignToFolder(designId: string, folderId: string): Promise<void> {
  throw new Error('Not implemented');
} 