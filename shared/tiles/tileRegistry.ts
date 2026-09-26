/**
 * Tile Registry, Definitions, and Converters for Hyperfold
 * Shared between the Game Engine and the Visual Editor.
 */

import { TileType, type TileDefinition, type TileGlyph } from '../types/tiles.ts';
import type { SpikeDirection } from '../types/entities.ts';

/**
 * Tile metadata dictionary mapping ASCII glyphs to visual attributes and descriptions.
 */
export const TILE_DEFINITIONS: Record<TileGlyph, TileDefinition> = {
  '#': {
    glyph: '#',
    name: 'Solid Block',
    description: 'Impassable terrain. Blocks movement, beams, and projectiles.',
    color: '#00e5ff',
    category: 'terrain',
  },
  '=': {
    glyph: '=',
    name: 'One-Way Platform',
    description: 'Jump through from below, solid on top. Duck + Jump to drop down.',
    color: '#00ffaa',
    category: 'terrain',
  },
  '^': {
    glyph: '^',
    name: 'Spike Up',
    description: 'Lethal hazard pointing upwards from floor or platform.',
    color: '#ff0055',
    category: 'hazard',
  },
  'v': {
    glyph: 'v',
    name: 'Spike Down',
    description: 'Lethal hazard hanging downwards from ceiling.',
    color: '#ff0055',
    category: 'hazard',
  },
  '<': {
    glyph: '<',
    name: 'Spike Left',
    description: 'Lethal hazard mounted on right wall pointing left.',
    color: '#ff0055',
    category: 'hazard',
  },
  '>': {
    glyph: '>',
    name: 'Spike Right',
    description: 'Lethal hazard mounted on left wall pointing right.',
    color: '#ff0055',
    category: 'hazard',
  },
  'B': {
    glyph: 'B',
    name: 'Bounce Pad',
    description: 'Super-propels the player vertically (configurable vy & vx).',
    color: '#ff00d4',
    category: 'mechanic',
  },
  'C': {
    glyph: 'C',
    name: 'Crumble Block',
    description: 'Disintegrates shortly after the player steps on it.',
    color: '#ffaa00',
    category: 'mechanic',
  },
  'G': {
    glyph: 'G',
    name: 'Hypercube Goal',
    description: 'Tesseract gateway beacon that completes the world.',
    color: '#ffff00',
    category: 'goal',
  },
  ' ': {
    glyph: ' ',
    name: 'Empty Space',
    description: 'Open breathable void airspace.',
    color: '#1a2233',
    category: 'terrain',
  },
};

/**
 * Standard palette presentation order for visual tile buttons in the editor.
 */
export const TILE_GLYPH_ORDER: TileGlyph[] = ['#', '=', '^', 'v', '<', '>', 'B', 'C', 'G', ' '];

/**
 * Keyboard numeric shortcut mapping for selecting tiles in the editor.
 */
export const TILE_HOTKEYS: Record<string, TileGlyph> = {
  '1': '#',
  '2': '=',
  '3': '^',
  '4': 'v',
  '5': '<',
  '6': '>',
  '7': 'B',
  '8': 'C',
  '9': 'G',
  '0': ' ',
};

/**
 * Extracts the explicit spike direction implied by an ASCII spike glyph ('^', 'v', '<', '>').
 */
export function getGlyphSpikeDirection(glyph: string): SpikeDirection | undefined {
  switch (glyph) {
    case '^':
      return 'up';
    case 'v':
      return 'down';
    case '<':
      return 'left';
    case '>':
      return 'right';
    default:
      return undefined;
  }
}

/**
 * Converts an ASCII grid glyph character into the corresponding numeric TileType enum value.
 */
export function glyphToTileType(glyph: string): TileType {
  switch (glyph) {
    case '#':
      return TileType.SOLID;
    case '=':
    case '-':
      return TileType.ONE_WAY;
    case '^':
    case 'v':
    case '<':
    case '>':
    case 'S':
      return TileType.SPIKE;
    case 'B':
      return TileType.BOUNCE;
    case 'C':
      return TileType.CRUMBLE;
    case 'G':
      return TileType.GOAL;
    case '.':
    case ' ':
      return TileType.EMPTY;
    default:
      throw new Error(`Unrecognized tile glyph '${glyph}'`);
  }
}

/**
 * Encodes a numeric TileType enum and optional spike orientation into an ASCII grid glyph character.
 */
export function tileTypeToGlyph(tile: TileType, spikeDir?: SpikeDirection): TileGlyph {
  switch (tile) {
    case TileType.SOLID:
      return '#';
    case TileType.ONE_WAY:
      return '=';
    case TileType.BOUNCE:
      return 'B';
    case TileType.CRUMBLE:
      return 'C';
    case TileType.GOAL:
      return 'G';
    case TileType.SPIKE: {
      if (spikeDir === 'down') return 'v';
      if (spikeDir === 'left') return '<';
      if (spikeDir === 'right') return '>';
      return '^';
    }
    case TileType.EMPTY:
    default:
      return ' ';
  }
}
