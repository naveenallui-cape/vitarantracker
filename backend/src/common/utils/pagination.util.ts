export type PaginationInput = {
  page?: number;
  limit?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function normalizePagination(input: PaginationInput): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  };
}
