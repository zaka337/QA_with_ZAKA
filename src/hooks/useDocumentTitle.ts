import { useEffect } from 'react';

const SITE_NAME = 'QA with Zaka';

/**
 * Sets the browser tab title for the current route. The SPA previously
 * shared one static <title> across every page (index.html), so the
 * Pricing page, Dashboard, and every course all showed the same title
 * in the tab, browser history, and bookmarks.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
