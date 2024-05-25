export interface PaginationResponse<T> {
  data: T[];
  result_count: number;
  result_offset: number;
  result_limit: number;
  result_total: number;
}
