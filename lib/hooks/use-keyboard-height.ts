'use client';

import { useEffect, useState } from 'react';

/**
 * Returns the height (in px) currently occupied by the virtual keyboard.
 * Works on iOS Safari via the visualViewport API.
 * Returns 0 on desktop or when the keyboard is closed.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // The keyboard height = layout height - visual viewport height - offset from top
      const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(kbHeight);
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return keyboardHeight;
}
