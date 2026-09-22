"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelMap = void 0;
class LevelMap {
    rooms = new Map();
    collectedItemIds = new Set();
    visitedCoordinates = new Set();
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
    getVisitedCoordinates() {
        return new Set(this.visitedCoordinates);
    }
    getDiscoveredRooms() {
        const list = [];
        for (const key of this.visitedCoordinates) {
            const room = this.rooms.get(key);
            if (room) {
                list.push(room);
            }
        }
        return list;
    }
    getAdjacentUnexploredCoords() {
        const unexplored = new Map();
        for (const key of this.visitedCoordinates) {
            const room = this.rooms.get(key);
            if (!room) continue;
            const candidates = [
                { x: room.coords.x - 1, y: room.coords.y, exitOpen: !!room.exits?.left, dir: 'left' },
                { x: room.coords.x + 1, y: room.coords.y, exitOpen: !!room.exits?.right, dir: 'right' },
                { x: room.coords.x, y: room.coords.y + 1, exitOpen: !!room.exits?.up, dir: 'up' },
                { x: room.coords.x, y: room.coords.y - 1, exitOpen: !!room.exits?.down, dir: 'down' },
            ];
            for (const cand of candidates) {
                if (!cand.exitOpen) continue;
                const candKey = LevelMap.coordKey(cand.x, cand.y);
                if (this.visitedCoordinates.has(candKey)) continue;
                if (this.hasRoom(cand.x, cand.y) || this.isDynamicMap()) {
                    if (!unexplored.has(candKey)) {
                        unexplored.set(candKey, { x: cand.x, y: cand.y, fromDirection: cand.dir });
                    }
                }
            }
        }
        return Array.from(unexplored.values());
    }
    isDynamicMap() {
        return false;
    }
}
exports.LevelMap = LevelMap;
