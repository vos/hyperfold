"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TileType = exports.ROWS = exports.COLS = exports.TILE_SIZE = exports.FACE_SIZE = void 0;
exports.getSpikeDirection = getSpikeDirection;
exports.FACE_SIZE = 800;
exports.TILE_SIZE = 40;
exports.COLS = exports.FACE_SIZE / exports.TILE_SIZE; // 20
exports.ROWS = exports.FACE_SIZE / exports.TILE_SIZE; // 20
var TileType;
(function (TileType) {
    TileType[TileType["EMPTY"] = 0] = "EMPTY";
    TileType[TileType["SOLID"] = 1] = "SOLID";
    TileType[TileType["ONE_WAY"] = 2] = "ONE_WAY";
    TileType[TileType["SPIKE"] = 3] = "SPIKE";
    TileType[TileType["BOUNCE"] = 4] = "BOUNCE";
    TileType[TileType["CRUMBLE"] = 5] = "CRUMBLE";
    TileType[TileType["GOAL"] = 6] = "GOAL";
})(TileType || (exports.TileType = TileType = {}));
/**
 * Resolves the orientation of a spike at (r, c) based on explicit config or adjacent solid surfaces.
 */
function getSpikeDirection(room, r, c) {
    if (room.spikeProps?.[`${r},${c}`]?.direction) {
        return room.spikeProps[`${r},${c}`].direction;
    }
    // Auto-detect based on adjacent tiles:
    // 1. Attached to floor/platform below:
    if (r + 1 < exports.ROWS && (room.tiles[r + 1][c] === TileType.SOLID || room.tiles[r + 1][c] === TileType.ONE_WAY)) {
        return 'up';
    }
    // 2. Attached to roof/ceiling above:
    if (r - 1 >= 0 && room.tiles[r - 1][c] === TileType.SOLID) {
        return 'down';
    }
    // 3. Attached to left wall:
    if (c - 1 >= 0 && room.tiles[r][c - 1] === TileType.SOLID) {
        return 'right';
    }
    // 4. Attached to right wall:
    if (c + 1 < exports.COLS && room.tiles[r][c + 1] === TileType.SOLID) {
        return 'left';
    }
    // 5. Default boundary fallbacks:
    if (r === exports.ROWS - 1)
        return 'up';
    if (r === 0)
        return 'down';
    if (c === 0)
        return 'right';
    if (c === exports.COLS - 1)
        return 'left';
    return 'up';
}
