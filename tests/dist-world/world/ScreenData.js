"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TileType = exports.ROWS = exports.COLS = exports.TILE_SIZE = exports.FACE_SIZE = exports.GATE_KEY_PALETTE = void 0;
exports.getSpikeDirection = getSpikeDirection;
exports.getGateColor = getGateColor;
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
exports.GATE_KEY_PALETTE = [
    '#ffe600', // Gold / Amber
    '#00f0ff', // Cyber Cyan
    '#ff0077', // Hot Magenta / Ruby
    '#00ff66', // Emerald Green
    '#b026ff', // Electric Purple
    '#ff6600', // Neon Orange
    '#0088ff', // Cobalt Blue
    '#ff2244', // Crimson Red
];
function getGateColor(id, explicitColor) {
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
    const idx = Math.abs(hash) % exports.GATE_KEY_PALETTE.length;
    return exports.GATE_KEY_PALETTE[idx];
}
function isGatedExit(exit) {
    return typeof exit === 'object' && exit !== null && typeof exit.id === 'string';
}
exports.isGatedExit = isGatedExit;
function getExitGate(room, dir) {
    const exit = room.exits?.[dir];
    if (isGatedExit(exit)) return exit;
    return room.gates?.[dir];
}
exports.getExitGate = getExitGate;
