"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelLoader = void 0;
const ScreenData_1 = require("./ScreenData");
const LevelMap_1 = require("./LevelMap");

class LevelLoader {
  static parseRoom(data) {
    if (!data.grid || data.grid.length !== ScreenData_1.ROWS) {
      throw new Error(`Room ${data.id} grid must contain exactly ${ScreenData_1.ROWS} rows, got ${data.grid?.length}`);
    }
    const tiles = [];
    const spikeProps = { ...(data.spikeProps || {}) };
    const bounceProps = { ...(data.bounceProps || {}) };

    for (let r = 0; r < ScreenData_1.ROWS; r++) {
      const rowStr = data.grid[r];
      if (rowStr.length !== ScreenData_1.COLS) {
        throw new Error(`Room ${data.id} row ${r} must contain exactly ${ScreenData_1.COLS} characters, got ${rowStr.length}`);
      }
      tiles[r] = [];
      for (let c = 0; c < ScreenData_1.COLS; c++) {
        const ch = rowStr[c];
        const key = `${r},${c}`;
        switch (ch) {
          case '#': tiles[r][c] = ScreenData_1.TileType.SOLID; break;
          case '=': case '-': tiles[r][c] = ScreenData_1.TileType.ONE_WAY; break;
          case '^': tiles[r][c] = ScreenData_1.TileType.SPIKE; if (!spikeProps[key]) spikeProps[key] = { direction: 'up' }; break;
          case 'v': tiles[r][c] = ScreenData_1.TileType.SPIKE; if (!spikeProps[key]) spikeProps[key] = { direction: 'down' }; break;
          case '<': tiles[r][c] = ScreenData_1.TileType.SPIKE; if (!spikeProps[key]) spikeProps[key] = { direction: 'left' }; break;
          case '>': tiles[r][c] = ScreenData_1.TileType.SPIKE; if (!spikeProps[key]) spikeProps[key] = { direction: 'right' }; break;
          case 'S': tiles[r][c] = ScreenData_1.TileType.SPIKE; break;
          case 'B': tiles[r][c] = ScreenData_1.TileType.BOUNCE; break;
          case 'C': tiles[r][c] = ScreenData_1.TileType.CRUMBLE; break;
          case 'G': tiles[r][c] = ScreenData_1.TileType.GOAL; break;
          case '.': case ' ': tiles[r][c] = ScreenData_1.TileType.EMPTY; break;
          default: throw new Error(`Room ${data.id} contains unrecognized tile glyph '${ch}' at row ${r}, col ${c}`);
        }
      }
    }

    const coords = Array.isArray(data.coords)
      ? { x: data.coords[0], y: data.coords[1] }
      : { x: data.coords.x, y: data.coords.y };

    let spawnPoint;
    if (data.spawnPoint) {
      spawnPoint = Array.isArray(data.spawnPoint)
        ? { x: data.spawnPoint[0], y: data.spawnPoint[1] }
        : { x: data.spawnPoint.x, y: data.spawnPoint.y };
    }

    const exits = {
      left: false,
      right: false,
      up: false,
      down: false,
    };
    const gates = {};
    const dirs = ['left', 'right', 'up', 'down'];

    if (data.exits) {
      for (const d of dirs) {
        const val = data.exits[d];
        if (typeof val === 'boolean') {
          exits[d] = val;
        } else if (typeof val === 'string' && val.trim().length > 0) {
          const gate = {
            id: val.trim(),
            color: ScreenData_1.getGateColor(val.trim()),
          };
          gates[d] = gate;
          exits[d] = gate;
        } else if (typeof val === 'object' && val !== null && val.id) {
          const gate = {
            id: val.id,
            color: ScreenData_1.getGateColor(val.id, val.color),
            label: val.label,
          };
          gates[d] = gate;
          exits[d] = gate;
        }
      }
    }

    const rawGates = data.gates || data.closedExits;
    if (rawGates) {
      if (Array.isArray(rawGates)) {
        for (const g of rawGates) {
          if (g && g.direction && g.id) {
            const gate = {
              id: g.id,
              color: ScreenData_1.getGateColor(g.id, g.color),
              label: g.label,
            };
            gates[g.direction] = gate;
            exits[g.direction] = gate;
          }
        }
      } else if (typeof rawGates === 'object') {
        for (const d of dirs) {
          const g = rawGates[d];
          if (typeof g === 'string' && g.trim().length > 0) {
            const gate = {
              id: g.trim(),
              color: ScreenData_1.getGateColor(g.trim()),
            };
            gates[d] = gate;
            exits[d] = gate;
          } else if (typeof g === 'object' && g !== null && g.id) {
            const gate = {
              id: g.id,
              color: ScreenData_1.getGateColor(g.id, g.color),
              label: g.label,
            };
            gates[d] = gate;
            exits[d] = gate;
          }
        }
      }
    }

    const collectibles = (data.collectibles || []).map((c) => ({
      id: c.id,
      type: c.type,
      x: c.pos ? c.pos[0] : (c.x ?? 0),
      y: c.pos ? c.pos[1] : (c.y ?? 0),
      collected: c.collected ?? false,
      color: c.color || (c.type === 'key' ? ScreenData_1.getGateColor(c.id) : undefined),
      label: c.label,
    }));

    return {
      id: data.id,
      coords,
      title: data.title,
      subtitle: data.subtitle,
      themeColor: data.themeColor,
      accentColor: data.accentColor,
      tiles,
      exits,
      gates: Object.keys(gates).length > 0 ? gates : undefined,
      collectibles,
      spawnPoint,
      bounceProps: Object.keys(bounceProps).length > 0 ? bounceProps : undefined,
      spikeProps: Object.keys(spikeProps).length > 0 ? spikeProps : undefined,
      movingPlatforms: data.movingPlatforms && data.movingPlatforms.length > 0 ? [...data.movingPlatforms] : undefined,
      laserBarriers: data.laserBarriers && data.laserBarriers.length > 0 ? [...data.laserBarriers] : undefined,
      laserTurrets: data.laserTurrets && data.laserTurrets.length > 0 ? [...data.laserTurrets] : undefined,
      portals: data.portals && data.portals.length > 0 ? [...data.portals] : undefined,
    };
  }

  static loadWorld(world, modularRooms) {
    const map = new LevelMap_1.LevelMap();
    let roomsToLoad = [];
    if (modularRooms && modularRooms.length > 0) {
      roomsToLoad = modularRooms;
    } else {
      for (const item of world.rooms) {
        if (typeof item === 'string') {
          throw new Error(`World ${world.id} contains string room reference '${item}', but no modularRooms were supplied`);
        }
        roomsToLoad.push(item);
      }
    }
    for (const roomData of roomsToLoad) {
      map.addRoom(LevelLoader.parseRoom(roomData));
    }
    return map;
  }
}
exports.LevelLoader = LevelLoader;

