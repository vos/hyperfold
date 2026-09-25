import type { WorldData } from '../types/world.ts';
import { exportWorldJson } from './serialization.ts';

export const DEFAULT_GAME_PORT = '3000';
export const STORAGE_KEY_CUSTOM_WORLD = 'hyperfold_custom_world';
export const STORAGE_KEY_GAME_PORT = 'hyperfold_game_port';
export const GAME_WINDOW_NAME = 'hyperfold_playtest_window';

let activeGameWindow: Window | null = null;

export function getActiveGameWindow(): Window | null {
  return activeGameWindow;
}

export function setActiveGameWindow(win: Window | null): void {
  activeGameWindow = win;
}

export function getStoredGamePort(): string {
  if (typeof window === 'undefined') return DEFAULT_GAME_PORT;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GAME_PORT);
    if (saved !== null && saved.trim() !== '') return saved.trim();
  } catch {
    // LocalStorage fallback
  }
  return window.location.port === '5174' ? DEFAULT_GAME_PORT : (window.location.port || '');
}

export function setStoredGamePort(port: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_GAME_PORT, port);
  } catch {
    // LocalStorage fallback
  }
}

export function computeGameTestUrl(customPort?: string): string {
  if (typeof window === 'undefined') return `http://localhost:${DEFAULT_GAME_PORT}/?load_custom=1`;

  const protocol = window.location.protocol;
  const host = window.location.hostname || 'localhost';
  const currentPort = window.location.port;
  const port = (customPort !== undefined ? customPort : getStoredGamePort()).trim();

  // Determine the game base path by stripping '/editor' (and anything after it) from the current pathname
  const gameBasePath = window.location.pathname.replace(/\/editor(\/.*)?$/i, '') || '/';
  const normalizedBasePath = gameBasePath.endsWith('/') ? gameBasePath : `${gameBasePath}/`;

  if (port && port !== currentPort && port !== '80' && port !== '443') {
    return `${protocol}//${host}:${port}${normalizedBasePath}?load_custom=1`;
  }
  return `${normalizedBasePath}?load_custom=1`;
}

export function launchGameTest(
  world: WorldData,
  customPort?: string,
  onStatusChange?: (status: 'idle' | 'opening' | 'connected') => void
): () => void {
  const jsonContent = exportWorldJson(world);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_WORLD, jsonContent);
    } catch {
      // LocalStorage fallback
    }
  }

  const targetUrl = computeGameTestUrl(customPort);
  onStatusChange?.('opening');

  let intervalId: number | null = null;

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'HYPERFOLD_GAME_READY') {
      (event.source as Window)?.postMessage(
        { type: 'HYPERFOLD_LOAD_WORLD', json: jsonContent },
        '*'
      );
    } else if (event.data?.type === 'HYPERFOLD_WORLD_LOADED') {
      onStatusChange?.('connected');
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      setTimeout(() => onStatusChange?.('idle'), 3000);
    }
  };

  const cleanup = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', handleMessage);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleMessage);

    try {
      let gameWin: Window | null = null;

      // Reuse existing open window if still active
      if (activeGameWindow && !activeGameWindow.closed) {
        gameWin = activeGameWindow;
        try {
          gameWin.focus();
        } catch {
          // Cross-origin focus guard
        }
        try {
          gameWin.postMessage({ type: 'HYPERFOLD_LOAD_WORLD', json: jsonContent }, '*');
        } catch {
          // Cross-origin message guard
        }
      } else {
        // Open or reuse the named target window/tab (replaces any previous tab with the same name)
        gameWin = window.open(targetUrl, GAME_WINDOW_NAME);
        activeGameWindow = gameWin;
        try {
          gameWin?.focus();
        } catch {
          // Cross-origin focus guard
        }
      }

      if (!gameWin) {
        onStatusChange?.('idle');
        cleanup();
        alert('Popup was blocked by your browser. Please allow popups for this page or download the JSON.');
        return cleanup;
      }

      let attempts = 0;
      intervalId = window.setInterval(() => {
        attempts++;
        if (gameWin.closed) {
          cleanup();
          onStatusChange?.('idle');
          return;
        }
        try {
          gameWin.postMessage({ type: 'HYPERFOLD_LOAD_WORLD', json: jsonContent }, '*');
        } catch {
          // Cross-origin warning suppression
        }
        if (attempts > 25) { // 5s timeout
          cleanup();
          onStatusChange?.('idle');
        }
      }, 200);
    } catch {
      onStatusChange?.('idle');
      cleanup();
    }
  }

  return cleanup;
}
