import type { WorldData } from '../types/world.ts';
import { createEmptyWorld, parseWorldJson, getBuiltinRoomsMap } from './serialization.ts';

export interface PresetWorldEntry {
  id: string;
  name: string;
  description: string;
  get: () => WorldData;
}

// Vite eager glob for all world manifests under @worlds
let viteWorldManifests: Record<string, any> = {};
try {
  viteWorldManifests = import.meta.glob(
    ['@worlds/**/world.json', '@worlds/*.json'],
    { eager: true, import: 'default' }
  );
} catch {
  // In Node.js test environment without Vite transform
}

function loadDiscoveredPresets(): PresetWorldEntry[] {
  const manifests: Record<string, any> = {};

  // 1. From Vite glob if available
  for (const [, manifest] of Object.entries(viteWorldManifests)) {
    if (manifest && typeof manifest === 'object' && manifest.id) {
      manifests[manifest.id] = manifest;
    }
  }

  // 2. If running in Node.js (e.g. node --test) where Vite glob is unavailable:
  const proc = (globalThis as any).process;
  if (Object.keys(manifests).length === 0 && proc?.versions?.node) {
    try {
      const fs = proc.getBuiltinModule?.('node:fs') || proc.getBuiltinModule?.('fs');
      const path = proc.getBuiltinModule?.('node:path') || proc.getBuiltinModule?.('path');
      if (fs && path) {
        const cwd = proc.cwd ? proc.cwd() : '.';
        const candidateDirs = [
          path.resolve(cwd, 'worlds'),
          path.resolve(cwd, '../worlds'),
        ];
        const worldsDir = candidateDirs.find((d: string) => fs.existsSync(d));
        if (worldsDir) {
          const entries = fs.readdirSync(worldsDir, { withFileTypes: true });
          for (const ent of entries) {
            if (ent.isDirectory() && ent.name !== 'schemas') {
              const manifestPath = path.join(worldsDir, ent.name, 'world.json');
              if (fs.existsSync(manifestPath)) {
                try {
                  const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                  if (m && m.id) manifests[m.id] = m;
                } catch {
                  // ignore
                }
              }
            } else if (ent.isFile() && ent.name.endsWith('.json')) {
              try {
                const m = JSON.parse(fs.readFileSync(path.join(worldsDir, ent.name), 'utf8'));
                if (m && m.id) manifests[m.id] = m;
              } catch {
                // ignore
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const list: PresetWorldEntry[] = [];
  const roomsMap = getBuiltinRoomsMap();

  // Known ordered IDs first (demo, mini), then any others alphabetically
  const ids = Object.keys(manifests);
  const orderedIds: string[] = [];
  if (ids.includes('demo')) orderedIds.push('demo');
  if (ids.includes('mini')) orderedIds.push('mini');
  for (const id of ids.sort()) {
    if (!orderedIds.includes(id)) {
      orderedIds.push(id);
    }
  }

  for (const id of orderedIds) {
    const manifest = manifests[id];
    list.push({
      id: manifest.id,
      name: manifest.title || manifest.id,
      description: manifest.description || '',
      get: () => parseWorldJson(JSON.stringify(manifest), roomsMap),
    });
  }

  // Always append the blank starter world
  list.push({
    id: 'blank',
    name: 'Blank Starter World (1 Sector)',
    description: 'Clean single sector with boundary walls, floor, spawn, and goal beacon.',
    get: () => createEmptyWorld(),
  });

  return list;
}

export const PRESET_WORLDS: PresetWorldEntry[] = loadDiscoveredPresets();
