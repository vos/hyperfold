import type { RoomData, WorldData } from '../types/world.ts';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface AdjacentSectorInfo {
  direction: Direction;
  targetCoords: [number, number];
  room?: RoomData;
  isConnected: boolean;     // Current room exit is open AND adjacent room exists
  isExitOpen: boolean;      // Current room exit is open
  isTwoWay: boolean;        // Both current room and adjacent room have exits facing each other
}

export function getAdjacentCoords(coords: [number, number], dir: Direction): [number, number] {
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

export function getOppositeDirection(dir: Direction): Direction {
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
 * Returns adjacent sector information for all 4 cardinal directions relative to the current room.
 */
export function getAdjacentSectors(
  currentRoom: RoomData,
  world: WorldData
): Record<Direction, AdjacentSectorInfo> {
  const dirs: Direction[] = ['up', 'down', 'left', 'right'];
  const result = {} as Record<Direction, AdjacentSectorInfo>;

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

