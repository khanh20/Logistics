export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
