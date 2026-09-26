/**
 * Canonical Tile Type Definitions for Hyperfold
 * Single source of truth shared between the Game Engine and the Visual Editor.
 */

/**
 * Numeric tile enumeration used by the physics engine and runtime grid representation.
 * Defined as a const object to support Node native type stripping without enum runtime overhead.
 */
export const TileType = {
  /** Empty passable air */
  EMPTY: 0,
  /** Solid impenetrable terrain block */
  SOLID: 1,
  /** Semi-permeable one-way jump-through platform (traversable from below, solid on top) */
  ONE_WAY: 2,
  /** Lethal hazard spike (kills player on contact) */
  SPIKE: 3,
  /** Springboard bounce pad (launches player with high velocity impulse) */
  BOUNCE: 4,
  /** Crumble block that collapses briefly after player stands on it */
  CRUMBLE: 5,
  /** Sector objective goal trigger */
  GOAL: 6,
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

/**
 * ASCII characters representing individual tiles in the 20x20 RoomData grid:
 * - '#' : Solid block
 * - '=' : One-way platform
 * - '^' : Spike pointing up
 * - 'v' : Spike pointing down
 * - '<' : Spike pointing left
 * - '>' : Spike pointing right
 * - 'B' : Bounce pad
 * - 'C' : Crumble block
 * - 'G' : Sector goal
 * - ' ' : Empty air ('.' is also recognized as empty during parsing)
 */
export type TileGlyph = '#' | '=' | '^' | 'v' | '<' | '>' | 'B' | 'C' | 'G' | ' ';

/**
 * Semantic grouping category for tiles in editor palettes and diagnostic validators.
 */
export type TileCategory = 'terrain' | 'hazard' | 'mechanic' | 'goal';

/**
 * Visual and behavioral metadata for an individual tile type.
 */
export interface TileDefinition {
  /** Single-character ASCII glyph representation */
  glyph: TileGlyph;
  /** Human-readable tile name */
  name: string;
  /** Detailed description of physical behavior */
  description: string;
  /** Display color in the visual editor UI */
  color: string;
  /** Functional category */
  category: TileCategory;
}
