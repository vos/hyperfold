"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelMap = void 0;
const ScreenData_1 = require("./ScreenData");
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
    hasKey(keyId) {
        return this.collectedItemIds.has(keyId);
    }
    getKeyItemLabel(keyId) {
        for (const room of this.rooms.values()) {
            for (const col of room.collectibles) {
                if (col.type === 'key' && col.id === keyId && col.label) {
                    return col.label;
                }
            }
        }
        return undefined;
    }
    getKeyLabel(keyId) {
        const itemLabel = this.getKeyItemLabel(keyId);
        if (itemLabel) {
            return itemLabel;
        }
        for (const room of this.rooms.values()) {
            for (const dir of ['left', 'right', 'up', 'down']) {
                const gate = (0, ScreenData_1.getExitGate)(room, dir);
                if (gate && gate.id === keyId && gate.label) {
                    return gate.label;
                }
            }
        }
        return undefined;
    }
    getRequiredKeyLabel(gate) {
        return this.getKeyItemLabel(gate.id) || this.getKeyLabel(gate.id) || gate.label || gate.id;
    }
    getCollectedKeys() {
        const keys = [];
        const seen = new Set();
        for (const room of this.rooms.values()) {
            for (const col of room.collectibles) {
                if (col.type === 'key' && this.collectedItemIds.has(col.id)) {
                    if (!seen.has(col.id)) {
                        seen.add(col.id);
                        keys.push({
                            ...col,
                            label: col.label || this.getKeyLabel(col.id),
                            color: col.color || (0, ScreenData_1.getGateColor)(col.id),
                        });
                    }
                }
            }
        }
        for (const id of this.collectedItemIds) {
            if (!seen.has(id)) {
                const resolvedLabel = this.getKeyLabel(id);
                const isKeyLike = id.startsWith('key') || id.includes('key') || !!resolvedLabel;
                if (isKeyLike) {
                    seen.add(id);
                    keys.push({
                        id,
                        type: 'key',
                        x: 0,
                        y: 0,
                        collected: true,
                        color: (0, ScreenData_1.getGateColor)(id),
                        label: resolvedLabel,
                    });
                }
            }
        }
        return keys;
    }
    isExitOpen(room, dir) {
        const exitVal = room.exits?.[dir];
        const gate = (0, ScreenData_1.getExitGate)(room, dir);
        if (gate) {
            return this.hasKey(gate.id);
        }
        return exitVal === true;
    }
    getUncollectedKeysInRoom(room) {
        return (room.collectibles || []).filter(
            (c) => c.type === 'key' && !this.isItemCollected(c.id)
        );
    }
    getLockedGatesInRoom(room) {
        const locked = [];
        for (const dir of ['left', 'right', 'up', 'down']) {
            const gate = (0, ScreenData_1.getExitGate)(room, dir);
            if (gate && !this.hasKey(gate.id)) {
                locked.push({
                    dir,
                    gate,
                    keyLabel: this.getRequiredKeyLabel(gate),
                    color: (0, ScreenData_1.getGateColor)(gate.id, gate.color),
                });
            }
        }
        return locked;
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
                { x: room.coords.x - 1, y: room.coords.y, exitOpen: this.isExitOpen(room, 'left'), dir: 'left' },
                { x: room.coords.x + 1, y: room.coords.y, exitOpen: this.isExitOpen(room, 'right'), dir: 'right' },
                { x: room.coords.x, y: room.coords.y + 1, exitOpen: this.isExitOpen(room, 'up'), dir: 'up' },
                { x: room.coords.x, y: room.coords.y - 1, exitOpen: this.isExitOpen(room, 'down'), dir: 'down' },
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
    findPortal(portalId) {
        for (const room of this.rooms.values()) {
            if (room.portals) {
                for (const portal of room.portals) {
                    if (portal.id === portalId) {
                        return { room, portal };
                    }
                }
            }
        }
        return undefined;
    }
    getDestinationRoomForPortal(portal) {
        if (!portal.targetPortalId) return undefined;
        const dest = this.findPortal(portal.targetPortalId);
        return dest?.room;
    }
    getDestinationColor(portal, currentRoom) {
        if (portal.targetPortalId) {
            const dest = this.findPortal(portal.targetPortalId);
            if (dest) {
                return dest.room.themeColor;
            }
        }
        return portal.themeColor || currentRoom.themeColor;
    }
    getAllPortals() {
        const list = [];
        for (const room of this.rooms.values()) {
            if (room.portals) {
                for (const portal of room.portals) {
                    list.push({ room, portal });
                }
            }
        }
        return list;
    }
    isDynamicMap() {
        return false;
    }
}
exports.LevelMap = LevelMap;
