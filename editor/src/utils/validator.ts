import {
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
} from '../types/world.ts';
import type {
  DiagnosticIssue,
  WorldData,
} from '../types/world.ts';

export function validateWorld(world: WorldData): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // 1. Check Starting Coordinates
  const startingRoom = world.rooms.find(
    (r) => r.coords[0] === world.startingCoords[0] && r.coords[1] === world.startingCoords[1]
  );
  if (!startingRoom) {
    issues.push({
      id: 'missing-starting-room',
      severity: 'error',
      message: `Starting coordinates [${world.startingCoords[0]}, ${world.startingCoords[1]}] do not match any sector in the world.`,
    });
  }

  // 2. Check for Duplicate Room IDs and Duplicate Coordinates
  const seenRoomIds = new Set<string>();
  const seenCoords = new Set<string>();
  let hasAnyGoal = false;

  for (const room of world.rooms) {
    // Duplicate Room ID
    if (seenRoomIds.has(room.id)) {
      issues.push({
        id: `duplicate-room-id-${room.id}`,
        severity: 'error',
        roomId: room.id,
        message: `Duplicate sector ID '${room.id}'. IDs must be unique across all sectors.`,
      });
    }
    seenRoomIds.add(room.id);

    // Duplicate Coordinates
    const coordKey = `${room.coords[0]},${room.coords[1]}`;
    if (seenCoords.has(coordKey)) {
      issues.push({
        id: `duplicate-coords-${coordKey}`,
        severity: 'error',
        roomId: room.id,
        message: `Multiple sectors occupy coordinates (${room.coords[0]}, ${room.coords[1]}).`,
      });
    }
    seenCoords.add(coordKey);

    // Check Grid Dimensions & Contents
    let roomHasGoal = false;
    for (let r = 0; r < GRID_ROWS; r++) {
      const row = room.grid[r] || '';
      for (let c = 0; c < GRID_COLS; c++) {
        const glyph = row[c];
        if (glyph === 'G') {
          roomHasGoal = true;
          hasAnyGoal = true;
        }
      }
    }

    // Check Spawn Point
    if (room.spawnPoint) {
      const [sx, sy] = room.spawnPoint;
      const col = Math.floor(sx / TILE_SIZE);
      const row = Math.floor(sy / TILE_SIZE);

      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        const tile = room.grid[row]?.[col];
        if (tile === '#') {
          issues.push({
            id: `spawn-in-solid-${room.id}`,
            severity: 'error',
            roomId: room.id,
            message: `Spawn point [${sx}, ${sy}] is inside a Solid block at row ${row}, col ${col}.`,
          });
        } else if (tile === '^' || tile === 'v' || tile === '<' || tile === '>') {
          issues.push({
            id: `spawn-in-spike-${room.id}`,
            severity: 'error',
            roomId: room.id,
            message: `Spawn point [${sx}, ${sy}] is inside a lethal Spike at row ${row}, col ${col}.`,
          });
        }
      } else {
        issues.push({
          id: `spawn-out-of-bounds-${room.id}`,
          severity: 'warning',
          roomId: room.id,
          message: `Spawn point [${sx}, ${sy}] is outside the 800x800 sector bounds.`,
        });
      }
    }

    // Check Duplicate Entity IDs inside Room
    const entityIds = new Set<string>();
    const checkEntityId = (id: string, type: string) => {
      if (entityIds.has(id)) {
        issues.push({
          id: `duplicate-entity-${room.id}-${id}`,
          severity: 'warning',
          roomId: room.id,
          message: `Duplicate ${type} ID '${id}' in ${room.title || room.id}.`,
        });
      }
      entityIds.add(id);
    };

    room.collectibles?.forEach((c) => checkEntityId(c.id, 'Collectible'));
    room.movingPlatforms?.forEach((p) => {
      checkEntityId(p.id, 'Moving Platform');
      if (p.speed <= 0) {
        issues.push({
          id: `platform-speed-${p.id}`,
          severity: 'warning',
          roomId: room.id,
          message: `Platform '${p.id}' has speed <= 0.`,
        });
      }
    });
    room.laserBarriers?.forEach((b) => {
      checkEntityId(b.id, 'Laser Barrier');
      const isAlways = Boolean(b.alwaysActive || (b.inactiveDuration !== undefined && b.inactiveDuration <= 0));
      if (!isAlways && b.activeDuration !== undefined && b.activeDuration <= 0) {
        issues.push({
          id: `barrier-duration-${b.id}`,
          severity: 'warning',
          roomId: room.id,
          message: `Laser Barrier '${b.id}' has 0 active duration.`,
        });
      }
    });
    room.laserTurrets?.forEach((t) => {
      checkEntityId(t.id, 'Laser Turret');
      if (t.fireInterval !== undefined && t.fireInterval <= 0) {
        issues.push({
          id: `turret-interval-${t.id}`,
          severity: 'warning',
          roomId: room.id,
          message: `Laser Turret '${t.id}' fireInterval must be greater than 0.`,
        });
      }
      if (t.targetRange !== undefined && t.targetRange <= 0) {
        issues.push({
          id: `turret-range-${t.id}`,
          severity: 'warning',
          roomId: room.id,
          message: `Laser Turret '${t.id}' targetRange must be greater than 0.`,
        });
      }
    });

    // Check Exit Linkages
    const [rx, ry] = room.coords;
    if (room.exits.right) {
      const neighbor = world.rooms.find((r) => r.coords[0] === rx + 1 && r.coords[1] === ry);
      if (!neighbor) {
        issues.push({
          id: `exit-open-void-${room.id}-right`,
          severity: 'info',
          roomId: room.id,
          message: `Right exit open, but no neighbor sector exists at (${rx + 1}, ${ry}).`,
        });
      } else if (!neighbor.exits.left) {
        issues.push({
          id: `exit-mismatch-${room.id}-right`,
          severity: 'warning',
          roomId: room.id,
          message: `Right exit open, but neighbor (${rx + 1}, ${ry}) has its Left exit closed.`,
        });
      }
    }
    if (room.exits.left) {
      const neighbor = world.rooms.find((r) => r.coords[0] === rx - 1 && r.coords[1] === ry);
      if (!neighbor) {
        issues.push({
          id: `exit-open-void-${room.id}-left`,
          severity: 'info',
          roomId: room.id,
          message: `Left exit open, but no neighbor sector exists at (${rx - 1}, ${ry}).`,
        });
      } else if (!neighbor.exits.right) {
        issues.push({
          id: `exit-mismatch-${room.id}-left`,
          severity: 'warning',
          roomId: room.id,
          message: `Left exit open, but neighbor (${rx - 1}, ${ry}) has its Right exit closed.`,
        });
      }
    }
    if (room.exits.up) {
      const neighbor = world.rooms.find((r) => r.coords[0] === rx && r.coords[1] === ry + 1);
      if (!neighbor) {
        issues.push({
          id: `exit-open-void-${room.id}-up`,
          severity: 'info',
          roomId: room.id,
          message: `Up exit open, but no neighbor sector exists at (${rx}, ${ry + 1}).`,
        });
      } else if (!neighbor.exits.down) {
        issues.push({
          id: `exit-mismatch-${room.id}-up`,
          severity: 'warning',
          roomId: room.id,
          message: `Up exit open, but neighbor (${rx}, ${ry + 1}) has its Down exit closed.`,
        });
      }
    }
    if (room.exits.down) {
      const neighbor = world.rooms.find((r) => r.coords[0] === rx && r.coords[1] === ry - 1);
      if (!neighbor) {
        issues.push({
          id: `exit-open-void-${room.id}-down`,
          severity: 'info',
          roomId: room.id,
          message: `Down exit open, but no neighbor sector exists at (${rx}, ${ry - 1}).`,
        });
      } else if (!neighbor.exits.up) {
        issues.push({
          id: `exit-mismatch-${room.id}-down`,
          severity: 'warning',
          roomId: room.id,
          message: `Down exit open, but neighbor (${rx}, ${ry - 1}) has its Up exit closed.`,
        });
      }
    }
  }

  // 3. World Goal Check
  if (!hasAnyGoal) {
    issues.push({
      id: 'missing-goal-beacon',
      severity: 'warning',
      message: "The world contains no Hypercube Goal ('G'). Players will have no finish condition.",
    });
  }

  // 4. Portal Validation (Duplicate IDs, target resolution, self-targeting)
  const allPortals = new Map<string, { portalId: string; roomId: string; roomTitle: string }>();
  for (const room of world.rooms) {
    if (room.portals) {
      for (const p of room.portals) {
        if (allPortals.has(p.id)) {
          const prev = allPortals.get(p.id)!;
          issues.push({
            id: `duplicate-portal-id-${p.id}`,
            severity: 'error',
            roomId: room.id,
            message: `Duplicate portal ID '${p.id}' found in '${room.title}' and '${prev.roomTitle}'. Portal IDs must be unique.`,
          });
        } else {
          allPortals.set(p.id, { portalId: p.id, roomId: room.id, roomTitle: room.title });
        }
      }
    }
  }

  for (const room of world.rooms) {
    if (room.portals) {
      for (const p of room.portals) {
        if (p.targetPortalId) {
          if (p.targetPortalId === p.id) {
            issues.push({
              id: `portal-self-target-${p.id}`,
              severity: 'warning',
              roomId: room.id,
              message: `Portal '${p.id}' in '${room.title}' targets itself.`,
            });
          } else if (!allPortals.has(p.targetPortalId)) {
            issues.push({
              id: `portal-missing-target-${p.id}`,
              severity: 'warning',
              roomId: room.id,
              message: `Portal '${p.id}' in '${room.title}' targets missing portal ID '${p.targetPortalId}'. Destination does not exist.`,
            });
          }
        }

        // Check if placed inside a solid block
        const pCenterX = p.x + (p.width ?? 44) * 0.5;
        const pCenterY = p.y + (p.height ?? 68) * 0.5;
        const col = Math.floor(pCenterX / TILE_SIZE);
        const row = Math.floor(pCenterY / TILE_SIZE);
        if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
          if (room.grid[row]?.[col] === '#') {
            issues.push({
              id: `portal-in-solid-${p.id}`,
              severity: 'warning',
              roomId: room.id,
              message: `Portal '${p.id}' center is placed inside a Solid block at row ${row}, col ${col}.`,
            });
          }
        }
      }
    }
  }

  return issues;
}

