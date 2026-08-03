import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableSearch } from './useTableSearch';

type Row = { name: string };
const rows: Row[] = Array.from({ length: 25 }, (_, i) => ({ name: `Student ${i + 1}` }));
const matches = (row: Row, q: string) => row.name.toLowerCase().includes(q);

describe('useTableSearch', () => {
  it('paginates at the given page size', () => {
    const { result } = renderHook(() => useTableSearch(rows, matches, 10));
    expect(result.current.paged).toHaveLength(10);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.totalCount).toBe(25);
  });

  it('filters by query and resets to page 1', () => {
    const { result } = renderHook(() => useTableSearch(rows, matches, 10));

    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);

    act(() => result.current.setQuery('Student 1'));
    // "Student 1", "Student 10".."Student 19" all match
    expect(result.current.totalCount).toBe(11);
    expect(result.current.page).toBe(1);
  });

  it('clamps the current page down when the underlying item list shrinks', () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: Row[] }) => useTableSearch(items, matches, 10),
      { initialProps: { items: rows } }
    );

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    rerender({ items: rows.slice(0, 5) }); // only 5 rows left -> 1 page
    expect(result.current.totalPages).toBe(1);
    expect(result.current.page).toBe(1);
  });
});
