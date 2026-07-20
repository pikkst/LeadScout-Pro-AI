import { useEffect } from 'react';

type ShortcutCallback = () => void;

export function useKeyboardShortcuts(callbacks: Record<string, ShortcutCallback>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      for (const [combo, callback] of Object.entries(callbacks)) {
        const parts = combo.split('+').map(p => p.trim().toLowerCase());
        const ctrl = parts.includes('ctrl');
        const shift = parts.includes('shift');
        const alt = parts.includes('alt');
        const key = parts[parts.length - 1];

        const match =
          (ctrl ? modKey : !modKey) &&
          (shift ? e.shiftKey : !e.shiftKey) &&
          (alt ? e.altKey : !e.altKey) &&
          e.key.toLowerCase() === key;

        if (match) {
          e.preventDefault();
          callback();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [callbacks]);
}
