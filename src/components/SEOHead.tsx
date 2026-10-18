import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: string;
}

const BASE_CANONICAL_DOMAIN = 'https://zhafx.vercel.app';
const DEFAULT_TITLE = 'Zhafx — Platform Streaming Film, Serial TV & Anime';
const DEFAULT_DESC =
  'Platform streaming film, serial TV, dan anime modern dengan rekomendasi bertenaga AI.';

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description = DEFAULT_DESC,
  canonicalPath,
  ogType = 'website',
}) => {
  const location = useLocation();

  useEffect(() => {
    const finalTitle = title ? `${title} — Zhafx` : DEFAULT_TITLE;
    document.title = finalTitle;

    // Resolve pure canonical path without query strings or hashes
    const rawPath = canonicalPath || location.pathname;
    const cleanPath = rawPath === '/' ? '/' : rawPath.replace(/\/+$/, '');
    const canonicalUrl = `${BASE_CANONICAL_DOMAIN}${cleanPath === '/' ? '/' : cleanPath}`;

    // Helper to safely set meta tag content
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (selector.includes('property=')) {
          const prop = selector.match(/property="([^"]+)"/)?.[1];
          if (prop) el.setAttribute('property', prop);
        } else if (selector.includes('name=')) {
          const name = selector.match(/name="([^"]+)"/)?.[1];
          if (name) el.setAttribute('name', name);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    // Update Meta Description
    setMeta('meta[name="description"]', 'content', description);

    // Update Open Graph
    setMeta('meta[property="og:title"]', 'content', finalTitle);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:type"]', 'content', ogType);

    // Update Twitter Cards
    setMeta('meta[name="twitter:title"]', 'content', finalTitle);
    setMeta('meta[name="twitter:description"]', 'content', description);

    // Update or Insert Canonical Link
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonicalUrl);
  }, [title, description, canonicalPath, location.pathname, ogType]);

  return null;
};
