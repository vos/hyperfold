/**
 * Portal Geometry and Target Calculations for Hyperfold
 * Shared between the Game Engine and the Visual Editor.
 */

import type { PortalConfig } from '../types/entities.ts';
import { DEFAULT_PORTAL } from './defaults.ts';

/**
 * Calculates the bounding box coordinates and dimensions of a portal.
 */
export function getPortalBounds(portal: PortalConfig): { x: number; y: number; width: number; height: number } {
  const width = portal.width ?? DEFAULT_PORTAL.width ?? 44;
  const height = portal.height ?? DEFAULT_PORTAL.height ?? 68;
  return {
    x: portal.x,
    y: portal.y,
    width,
    height,
  };
}

/**
 * Calculates the center focal point (x, y) of a portal for player teleportation positioning.
 */
export function getPortalCenter(portal: PortalConfig): { x: number; y: number } {
  const bounds = getPortalBounds(portal);
  return {
    x: bounds.x + bounds.width * 0.5,
    y: bounds.y + bounds.height * 0.5,
  };
}
