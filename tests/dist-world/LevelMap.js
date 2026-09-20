"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelMap = void 0;
class LevelMap {
    constructor() {
        this.rooms = new Map();
        this.collectedItemIds = new Set();
        this.visitedCoordinates = new Set();
    }
    static coordKey(x, y) {
        return `${x},${y}`;
    }
    addRoom(room) {
        const key = LevelMap.coordKey(room.coords.x, room.coords.y);
        this.rooms.set(key, room);
    }
    getRoom(x, y) {
        return this.rooms.get(LevelMap.coordKey(x, y));
    }
    hasRoom(x, y) {
        return this.rooms.has(LevelMap.coordKey(x, y));
    }
    markVisited(x, y) {
        this.visitedCoordinates.add(LevelMap.coordKey(x, y));
    }
    isVisited(x, y) {
        return this.visitedCoordinates.has(LevelMap.coordKey(x, y));
    }
    collectItem(id) {
        this.collectedItemIds.add(id);
    }
    isItemCollected(id) {
        return this.collectedItemIds.has(id);
    }
    getCollectedCount() {
        return this.collectedItemIds.size;
    }
    getTotalCollectiblesCount() {
        let total = 0;
        for (const room of this.rooms.values()) {
            total += room.collectibles.length;
        }
        return total;
    }
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
    getDiscoveredRoomsCount() {
        return this.visitedCoordinates.size;
    }
    getTotalRoomsCount() {
        return this.rooms.size;
    }
}
exports.LevelMap = LevelMap;
