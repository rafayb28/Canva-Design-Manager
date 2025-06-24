export interface CanvaDesign {
  id: string;
  title: string;
  thumbnail?: { url: string };
}

export interface CanvaFolder {
  id: string;
  name: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  continuation?: string;
} 