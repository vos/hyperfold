/**
 * Key and Gate Palette and Resolvers for Hyperfold
 * Shared between the Game Engine and the Visual Editor.
 */

import type { ExitConfig, ExitDirection, ExitGateConfig, RoomExits } from '../types/world.ts';

/**
 * Standard vibrant neon color palette for gate keys and locked barriers.
 */
export const GATE_KEY_PALETTE = [
  '#ffe600', // Gold / Amber
  '#00f0ff', // Cyber Cyan
  '#ff0077', // Hot Magenta / Ruby
  '#00ff66', // Emerald Green
  '#b026ff', // Electric Purple
  '#ff6600', // Neon Orange
  '#0088ff', // Cobalt Blue
  '#ff2244', // Crimson Red
];

/**
 * Resolves a gate/key neon color from an explicit override, name heuristic (e.g. "key_cyan"),
 * or a deterministic hash index into GATE_KEY_PALETTE.
 */
export function getGateColor(id: string, explicitColor?: string): string {
  if (explicitColor) return explicitColor;
  const lower = id.toLowerCase();
  if (lower.includes('gold') || lower.includes('yellow')) return '#ffe600';
  if (lower.includes('cyan') || lower.includes('teal')) return '#00f0ff';
  if (lower.includes('pink') || lower.includes('magenta')) return '#ff0077';
  if (lower.includes('green') || lower.includes('emerald') || lower.includes('lime')) return '#00ff66';
  if (lower.includes('purple') || lower.includes('violet')) return '#b026ff';
  if (lower.includes('orange') || lower.includes('amber')) return '#ff6600';
  if (lower.includes('blue') || lower.includes('azure')) return '#0088ff';
  if (lower.includes('red') || lower.includes('ruby')) return '#ff2244';

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GATE_KEY_PALETTE.length;
  return GATE_KEY_PALETTE[idx];
}

/**
 * Type guard testing whether an exit boundary configuration is a locked ExitGateConfig.
 */
export function isGatedExit(exit: ExitConfig | undefined): exit is ExitGateConfig {
  return typeof exit === 'object' && exit !== null && typeof exit.id === 'string';
}

/**
 * Helper to retrieve the ExitGateConfig for a specified cardinal exit direction on a room,
 * checking both room.exits[dir] and room.gates[dir].
 */
export function getExitGate(
  room: { exits?: RoomExits; gates?: Partial<Record<ExitDirection, ExitGateConfig>> },
  dir: ExitDirection
): ExitGateConfig | undefined {
  const exit = room.exits?.[dir];
  if (isGatedExit(exit)) return exit;
  return room.gates?.[dir];
}
