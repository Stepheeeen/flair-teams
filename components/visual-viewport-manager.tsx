'use client';

import { useEffect } from 'react';

export function VisualViewportManager() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;

    const updateViewport = () => {
      const { height, offsetTop } = vv;
      
      // We set style variables on documentElement (HTML tag)
      document.documentElement.style.setProperty(
        '--visual-viewport-height',
        `${height}px`
      );
      document.documentElement.style.setProperty(
        '--visual-viewport-top',
        `${offsetTop}px`
      );
    };

    // When inputs blur, iOS Safari sometimes leaves the body scroll panned.
    // Resetting scroll ensures layout returns to normal.
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        setTimeout(() => {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          document.body.scrollTop = 0;
        }, 100);
      }
    };

    // Listen to resize and scroll of the visual viewport
    vv.addEventListener('resize', updateViewport);
    vv.addEventListener('scroll', updateViewport);
    document.addEventListener('focusout', handleFocusOut);

    // Initial update
    updateViewport();

    return () => {
      vv.removeEventListener('resize', updateViewport);
      vv.removeEventListener('scroll', updateViewport);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return null;
}
