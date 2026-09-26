/**
 * Canonical Spatial and Grid Dimensions for Hyperfold
 * Single source of truth shared between the Game Engine and the Visual Editor.
 */

/**
 * Standard width and height of each room/face in game world pixels.
 * (800x800 pixel canvas).
 */
export const ROOM_SIZE = 800;

/**
 * Dimensions (width and height) of a single square grid tile in pixels.
 * (40x40 pixel tile).
 */
export const TILE_SIZE = 40;

/**
 * Number of horizontal tile columns per sector grid: 800 / 40 = 20.
 */
export const GRID_COLS = 20;

/**
 * Number of vertical tile rows per sector grid: 800 / 40 = 20.
 */
export const GRID_ROWS = 20;

/**
 * Total number of tiles in a single sector: 20 * 20 = 400.
 */
export const TOTAL_TILES = GRID_COLS * GRID_ROWS;
