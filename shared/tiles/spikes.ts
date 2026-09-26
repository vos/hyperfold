/**
 * Spike Orientation and Surface Attachment Resolver for Hyperfold
 * Shared between the Game Engine and the Visual Editor.
 */

import { GRID_COLS, GRID_ROWS } from '../constants.ts';
import type { SpikeDirection } from '../types/entities.ts';
import { TileType } from '../types/tiles.ts';

/**
 * Resolves the orientation of a spike at (r, c) based on explicit config or adjacent solid surfaces.
 */
export function resolveSpikeDirection(
  tiles: number[][],
  r: number,
  c: number,
  explicitDirection?: SpikeDirection
): SpikeDirection {
  if (explicitDirection) {
    return explicitDirection;
  }

  // Auto-detect based on adjacent tiles:
  // 1. Attached to floor/platform below:
  if (r + 1 < GRID_ROWS && (tiles[r + 1]?.[c] === TileType.SOLID || tiles[r + 1]?.[c] === TileType.ONE_WAY)) {
    return 'up';
  }
  // 2. Attached to roof/ceiling above:
  if (r - 1 >= 0 && tiles[r - 1]?.[c] === TileType.SOLID) {
    return 'down';
  }
  // 3. Attached to left wall:
  if (c - 1 >= 0 && tiles[r]?.[c - 1] === TileType.SOLID) {
    return 'right';
  }
  // 4. Attached to right wall:
  if (c + 1 < GRID_COLS && tiles[r]?.[c + 1] === TileType.SOLID) {
    return 'left';
  }
  // 5. Default boundary fallbacks:
  if (r === GRID_ROWS - 1) return 'up';
  if (r === 0) return 'down';
  if (c === 0) return 'right';
  if (c === GRID_COLS - 1) return 'left';
  return 'up';
}

/**
 * Resolves spike orientation for either a room object or raw tile matrix.
 */
export function getSpikeDirection(
  roomOrTiles: { tiles: number[][]; spikeProps?: Record<string, { direction?: SpikeDirection }> } | number[][],
  r: number,
  c: number,
  explicitDirection?: SpikeDirection
): SpikeDirection {
  if (Array.isArray(roomOrTiles)) {
    return resolveSpikeDirection(roomOrTiles, r, c, explicitDirection);
  }
  const explicit = explicitDirection ?? roomOrTiles.spikeProps?.[`${r},${c}`]?.direction;
  return resolveSpikeDirection(roomOrTiles.tiles, r, c, explicit);
}
