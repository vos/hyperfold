/**
 * Hypercube Lattice Navigation and Coordinate Math for Hyperfold
 * Shared between the Game Engine and the Visual Editor.
 */

import type { ExitDirection, RoomData, WorldData } from '../types/world.ts';

/**
 * Neighbor sector connectivity metadata for a single cardinal direction.
 */
export interface AdjacentSectorInfo {
  /** Cardinal direction towards the neighboring sector */
  direction: ExitDirection;
  /** Coordinate position [x, y] of the target neighbor */
  targetCoords: [number, number];
  /** RoomData definition of the neighbor if present in the world bundle */
  room?: RoomData;
  /** Whether the current sector's exit is open and the neighbor room exists */
  isConnected: boolean;
  /** Whether the current sector's exit is configured as open (non-false) */
  isExitOpen: boolean;
  /** Whether both adjacent rooms have matching open exits facing each other (symmetric 2-way passage) */
  isTwoWay: boolean;
}

/**
 * Calculates the adjacent sector lattice coordinates for a given direction.
 * In the Hyperfold world coordinate system:
 * - 'up': y + 1
 * - 'down': y - 1
 * - 'left': x - 1
 * - 'right': x + 1
 */
export function getAdjacentCoords(coords: [number, number], dir: ExitDirection): [number, number] {
  const [x, y] = coords;
  switch (dir) {
    case 'up':
      return [x, y + 1];
    case 'down':
      return [x, y - 1];
    case 'left':
      return [x - 1, y];
    case 'right':
      return [x + 1, y];
  }
}

/**
 * Returns the inverse opposite cardinal direction.
 */
export function getOppositeDirection(dir: ExitDirection): ExitDirection {
  switch (dir) {
    case 'up':
      return 'down';
    case 'down':
      return 'up';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
}

/**
 * Resolves adjacent neighbor sector info across all four cardinal directions for a given room.
 */
export function getAdjacentSectors(
  currentRoom: RoomData,
  world: WorldData
): Record<ExitDirection, AdjacentSectorInfo> {
  const dirs: ExitDirection[] = ['up', 'down', 'left', 'right'];
  const result = {} as Record<ExitDirection, AdjacentSectorInfo>;

  for (const dir of dirs) {
    const target = getAdjacentCoords(currentRoom.coords, dir);
    const adjacent = world.rooms.find(
      (r) => r.coords[0] === target[0] && r.coords[1] === target[1]
    );
    const isExitOpen = !!currentRoom.exits?.[dir];
    const isConnected = isExitOpen && !!adjacent;
    const oppDir = getOppositeDirection(dir);
    const isTwoWay = isConnected && !!adjacent?.exits?.[oppDir];

    result[dir] = {
      direction: dir,
      targetCoords: target,
      room: adjacent,
      isConnected,
      isExitOpen,
      isTwoWay,
    };
  }

  return result;
}
