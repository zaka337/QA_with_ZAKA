import { useMemo, useState } from 'react';

/**
 * Client-side search + pagination for admin list views. Fine at the scale
 * these tables currently run at (tens to low hundreds of rows) — if the
 * platform grows enough that fetching every row up front becomes a real
 * cost, this is the point where search/pagination should move server-side.
 */
export function useTableSearch<T>(items: T[], matches: (item: T, query: string) => boolean, pageSize = 10) {
  const [query, setQueryRaw] = useState('');
  const [page, setPage] = useState(1);

  const setQuery = (q: string) => {
    setQueryRaw(q);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => matches(item, q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  return { query, setQuery, page: currentPage, setPage, totalPages, paged, totalCount: filtered.length };
}
