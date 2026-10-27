import { useEffect } from 'react';

interface PageMeta {
  title: string;
  description?: string;
}

/**
 * Sets `document.title` and (optionally) the `meta[name=description]` tag
 * for the current page, restoring the previous values on unmount.
 *
 * Google's OAuth verification crawler looks for meaningful per-page
 * metadata on the privacy policy and terms pages. A shared SPA shell
 * that carries the same title on every route is technically fine but
 * weak; this hook lets each public page declare its own.
 */
export const usePageMeta = ({ title, description }: PageMeta): void => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let meta: HTMLMetaElement | null = null;
    let previousContent: string | null = null;
    if (description) {
      meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (meta) {
        previousContent = meta.getAttribute('content');
        meta.setAttribute('content', description);
      } else {
        meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = description;
        document.head.appendChild(meta);
      }
    }

    return () => {
      document.title = previousTitle;
      if (meta && description) {
        if (previousContent !== null) {
          meta.setAttribute('content', previousContent);
        } else {
          meta.remove();
        }
      }
    };
  }, [title, description]);
};