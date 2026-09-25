import { ScreenData, ExitDirection, CollectibleData, ExitGateConfig, getGateColor, getExitGate, PortalConfig } from './ScreenData';

export class LevelMap {
  private rooms: Map<string, ScreenData> = new Map();
  private collectedItemIds: Set<string> = new Set();
  private visitedCoordinates: Set<string> = new Set();
  private mapChangeListeners: Array<() => void> = [];

  public static coordKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  public onMapChanged(listener: () => void): () => void {
    this.mapChangeListeners.push(listener);
    return () => {
      this.mapChangeListeners = this.mapChangeListeners.filter(l => l !== listener);
    };
  }

  public notifyMapChanged(): void {
    for (const listener of this.mapChangeListeners) {
      try {
        listener();
      } catch (e) {
        console.error('Error in mapChangeListener:', e);
      }
    }
  }

  public addRoom(room: ScreenData): void {
    const key = LevelMap.coordKey(room.coords.x, room.coords.y);
    const wasPresent = this.rooms.has(key);
    this.rooms.set(key, room);
    if (!wasPresent) {
      this.notifyMapChanged();
    }
  }

  public getRoom(x: number, y: number, _forceGenerate?: boolean): ScreenData | undefined {
    return this.rooms.get(LevelMap.coordKey(x, y));
  }

  public hasRoom(x: number, y: number): boolean {
    return this.rooms.has(LevelMap.coordKey(x, y));
  }

  public markVisited(x: number, y: number): void {
    const key = LevelMap.coordKey(x, y);
    const wasPresent = this.visitedCoordinates.has(key);
    this.visitedCoordinates.add(key);
    if (!wasPresent) {
      this.notifyMapChanged();
    }
  }

  public markAllVisited(): void {
    let changed = false;
    for (const room of this.rooms.values()) {
      const key = LevelMap.coordKey(room.coords.x, room.coords.y);
      if (!this.visitedCoordinates.has(key)) {
        this.visitedCoordinates.add(key);
        changed = true;
      }
    }
    if (changed) {
      this.notifyMapChanged();
    }
  }

  public resetRoomCollectibles(room: ScreenData): void {
    if (room.collectibles) {
      for (const col of room.collectibles) {
        this.collectedItemIds.delete(col.id);
      }
    }
  }

  public collectAllInRoom(room: ScreenData): void {
    if (room.collectibles) {
      for (const col of room.collectibles) {
        this.collectItem(col.id);
      }
    }
  }

  public collectAllKeys(): void {
    for (const room of this.rooms.values()) {
      for (const col of room.collectibles) {
        if (col.type === 'key') {
          this.collectItem(col.id);
        }
      }
      for (const dir of ['left', 'right', 'up', 'down'] as ExitDirection[]) {
        const gate = getExitGate(room, dir);
        if (gate) {
          this.collectItem(gate.id);
        }
      }
    }
  }

  public collectAllPrisms(): void {
    for (const room of this.rooms.values()) {
      for (const col of room.collectibles) {
        if (col.type === 'prism' || col.type === 'core') {
          this.collectItem(col.id);
        }
      }
    }
  }

  public isVisited(x: number, y: number): boolean {
    return this.visitedCoordinates.has(LevelMap.coordKey(x, y));
  }

  public collectItem(id: string): void {
    this.collectedItemIds.add(id);
  }

  public isItemCollected(id: string): boolean {
    return this.collectedItemIds.has(id);
  }

  public hasKey(keyId: string): boolean {
    return this.collectedItemIds.has(keyId);
  }

  public getKeyItemLabel(keyId: string): string | undefined {
    for (const room of this.rooms.values()) {
      for (const col of room.collectibles) {
        if (col.type === 'key' && col.id === keyId && col.label) {
          return col.label;
        }
      }
    }
    return undefined;
  }

  public getKeyLabel(keyId: string): string | undefined {
    const itemLabel = this.getKeyItemLabel(keyId);
    if (itemLabel) {
      return itemLabel;
    }
    for (const room of this.rooms.values()) {
      for (const dir of ['left', 'right', 'up', 'down'] as ExitDirection[]) {
        const gate = getExitGate(room, dir);
        if (gate && gate.id === keyId && gate.label) {
          return gate.label;
        }
      }
    }
    return undefined;
  }

  public getRequiredKeyLabel(gate: ExitGateConfig): string {
    return this.getKeyItemLabel(gate.id) || this.getKeyLabel(gate.id) || gate.label || gate.id;
  }

  public getCollectedKeys(): CollectibleData[] {
    const keys: CollectibleData[] = [];
    const seen = new Set<string>();

    for (const room of this.rooms.values()) {
      for (const col of room.collectibles) {
        if (col.type === 'key' && this.collectedItemIds.has(col.id)) {
          if (!seen.has(col.id)) {
            seen.add(col.id);
            keys.push({
              ...col,
              label: col.label || this.getKeyLabel(col.id),
              color: col.color || getGateColor(col.id),
            });
          }
        }
      }
    }

    // Also check for any standalone collected key IDs
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
            color: getGateColor(id),
            label: resolvedLabel,
          });
        }
      }
    }

    return keys;
  }

  public isExitOpen(room: ScreenData, dir: ExitDirection): boolean {
    const gate = getExitGate(room, dir);
    if (gate) {
      return this.hasKey(gate.id);
    }
    return room.exits?.[dir] === true;
  }

  public getUncollectedKeysInRoom(room: ScreenData): CollectibleData[] {
    return (room.collectibles || []).filter(
      (c) => c.type === 'key' && !this.isItemCollected(c.id)
    );
  }

  public getLockedGatesInRoom(room: ScreenData): { dir: ExitDirection; gate: ExitGateConfig; keyLabel: string; color: string }[] {
    const locked: { dir: ExitDirection; gate: ExitGateConfig; keyLabel: string; color: string }[] = [];
    for (const dir of ['left', 'right', 'up', 'down'] as ExitDirection[]) {
      const gate = getExitGate(room, dir);
      if (gate && !this.hasKey(gate.id)) {
        locked.push({
          dir,
          gate,
          keyLabel: this.getRequiredKeyLabel(gate),
          color: getGateColor(gate.id, gate.color),
        });
      }
    }
    return locked;
  }

  public getCollectedCount(): number {
    return this.collectedItemIds.size;
  }

  public getTotalCollectiblesCount(): number {
    let total = 0;
    for (const room of this.rooms.values()) {
      total += room.collectibles.length;
    }
    return total;
  }

  public getAllRooms(): ScreenData[] {
    return Array.from(this.rooms.values());
  }

  public getDiscoveredRoomsCount(): number {
    return this.visitedCoordinates.size;
  }

  public getTotalRoomsCount(): number {
    return this.rooms.size;
  }

  public getVisitedCoordinates(): Set<string> {
    return new Set(this.visitedCoordinates);
  }

  public getDiscoveredRooms(): ScreenData[] {
    const list: ScreenData[] = [];
    for (const key of this.visitedCoordinates) {
      const room = this.rooms.get(key);
      if (room) {
        list.push(room);
      }
    }
    return list;
  }

  public getAdjacentUnexploredCoords(): { x: number; y: number; fromDirection: 'left' | 'right' | 'up' | 'down' }[] {
    const unexplored = new Map<string, { x: number; y: number; fromDirection: 'left' | 'right' | 'up' | 'down' }>();

    for (const key of this.visitedCoordinates) {
      const room = this.rooms.get(key);
      if (!room) continue;

      const candidates: { x: number; y: number; exitOpen: boolean; dir: 'left' | 'right' | 'up' | 'down' }[] = [
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

  public findPortal(portalId: string): { room: ScreenData; portal: PortalConfig } | undefined {
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

  public getDestinationRoomForPortal(portal: PortalConfig): ScreenData | undefined {
    if (!portal.targetPortalId) return undefined;
    const dest = this.findPortal(portal.targetPortalId);
    return dest?.room;
  }

  public getDestinationColor(portal: PortalConfig, currentRoom: ScreenData): string {
    if (portal.targetPortalId) {
      const dest = this.findPortal(portal.targetPortalId);
      if (dest) {
        return dest.room.themeColor;
      }
    }
    return portal.themeColor || currentRoom.themeColor;
  }

  public getAllPortals(): Array<{ room: ScreenData; portal: PortalConfig }> {
    const list: Array<{ room: ScreenData; portal: PortalConfig }> = [];
    for (const room of this.rooms.values()) {
      if (room.portals) {
        for (const portal of room.portals) {
          list.push({ room, portal });
        }
      }
    }
    return list;
  }

  protected isDynamicMap(): boolean {
    return false;
  }
}
