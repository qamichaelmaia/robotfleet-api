import { describe, expect, it } from 'vitest';
import { paginationMeta, toSkipTake } from '../../src/shared/utils/pagination';

describe('pagination utilities', () => {
  it('computes totalPages using ceiling division', () => {
    expect(paginationMeta(1, 20, 143)).toEqual({ page: 1, limit: 20, total: 143, totalPages: 8 });
  });

  it('returns at least one page when total is zero', () => {
    expect(paginationMeta(1, 20, 0)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });
  });

  it('converts page/limit into a prisma skip/take pair', () => {
    expect(toSkipTake(3, 10)).toEqual({ skip: 20, take: 10 });
  });
});
