import type { TileDefinition, TileGlyph } from '../types/world.ts';

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

