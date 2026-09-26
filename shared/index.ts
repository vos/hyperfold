/**
 * Hyperfold Shared Subsystem
 *
 * Canonical single source of truth for:
 * - Spatial dimensions & grid constants
 * - Entity data models, states, and defaults
 * - Declarative world and sector definitions
 * - Tile enumeration, definitions, and converters
 * - Kinematic solvers (moving platforms, laser barriers, turrets, portals)
 * - Hypercube lattice navigation math
 */

export * from './constants.ts';
export * from './types/entities.ts';
export * from './types/world.ts';
export * from './types/tiles.ts';
export * from './entities/defaults.ts';
export * from './entities/platform.ts';
export * from './entities/barrier.ts';
export * from './entities/turret.ts';
export * from './entities/portal.ts';
export * from './entities/collectible.ts';
export * from './tiles/tileRegistry.ts';
export * from './tiles/spikes.ts';
export * from './navigation/coordinates.ts';
