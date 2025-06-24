export interface PaginatedResponse<T> {
  items: T[];
  continuation?: string;
  hasMore: boolean;
  total?: number;
}

export interface CanvaFolder {
  id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  designCount?: number;
}

export interface CanvaDesign {
  id: string;
  title: string;
  thumbnail?: {
    url: string;
  };
  thumbnailUrl?: string; // Legacy field for compatibility
  createdAt: string;
  updatedAt: string;
  type: string;
  status: string;
} 