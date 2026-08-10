import { useEffect } from 'react';
import { useDocumentTitle } from './useDocumentTitle';

const SITE_URL = 'https://qa-with-zaka-4pc9.vercel.app';
const SITE_NAME = 'QA with Zaka';

interface SeoMetaOptions {
  title: string;
  description: string;
  /** Route path, e.g. '/pricing' or '/capability/foundations-of-code' */
  path: string;
}

/**
 * Sets per-route <title>, meta description, canonical URL, and Open Graph
 * tags. Without this, every route shared index.html's single static
 * canonical tag pointing at "/" — telling search engines every page
 * (Pricing, each capability page) was a duplicate of the homepage, which
 * can suppress them from being indexed as their own results entirely.
 */
export function useSeoMeta({ title, description, path }: SeoMetaOptions) {
  useDocumentTitle(title);

  useEffect(() => {
    const descTag = document.querySelector('meta[name="description"]');
    const canonicalTag = document.querySelector('link[rel="canonical"]');
    const ogTitleTag = document.querySelector('meta[property="og:title"]');
    const ogDescTag = document.querySelector('meta[property="og:description"]');
    const ogUrlTag = document.querySelector('meta[property="og:url"]');
    const twitterTitleTag = document.querySelector('meta[property="twitter:title"]');
    const twitterDescTag = document.querySelector('meta[property="twitter:description"]');
    const twitterUrlTag = document.querySelector('meta[property="twitter:url"]');

    const tags = [descTag, canonicalTag, ogTitleTag, ogDescTag, ogUrlTag, twitterTitleTag, twitterDescTag, twitterUrlTag] as const;
    const attr = (el: Element | null) => (el?.tagName === 'LINK' ? 'href' : 'content');
    const previousValues = tags.map((el) => el?.getAttribute(attr(el)) ?? null);

    const url = `${SITE_URL}${path}`;
    const fullTitle = `${title} | ${SITE_NAME}`;

    descTag?.setAttribute('content', description);
    canonicalTag?.setAttribute('href', url);
    ogTitleTag?.setAttribute('content', fullTitle);
    ogDescTag?.setAttribute('content', description);
    ogUrlTag?.setAttribute('content', url);
    twitterTitleTag?.setAttribute('content', fullTitle);
    twitterDescTag?.setAttribute('content', description);
    twitterUrlTag?.setAttribute('content', url);

    return () => {
      tags.forEach((el, i) => {
        if (el && previousValues[i] != null) el.setAttribute(attr(el), previousValues[i]!);
      });
    };
  }, [title, description, path]);
}
