"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TileType = exports.ROWS = exports.COLS = exports.TILE_SIZE = exports.FACE_SIZE = void 0;
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
