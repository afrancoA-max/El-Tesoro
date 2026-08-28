import { AppError } from "./AppError";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const rawPage = query.page;
  const rawLimit = query.limit;

  const page = rawPage !== undefined ? Number(rawPage) : 1;
  const limit = rawLimit !== undefined ? Number(rawLimit) : DEFAULT_LIMIT;

  if (!Number.isInteger(page) || page < 1) {
    throw AppError.badRequest("INVALID_PAGE", "El parámetro 'page' debe ser un entero mayor o igual a 1.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw AppError.badRequest(
      "INVALID_LIMIT",
      `El parámetro 'limit' debe ser un entero entre 1 y ${MAX_LIMIT}.`,
    );
  }

  return { page, limit, skip: (page - 1) * limit };
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  { page, limit }: PaginationParams,
): PaginatedResult<T> {
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
