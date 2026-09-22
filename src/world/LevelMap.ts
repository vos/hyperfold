import { ScreenData } from './ScreenData';

export class LevelMap {
  private rooms: Map<string, ScreenData> = new Map();
  private collectedItemIds: Set<string> = new Set();
  private visitedCoordinates: Set<string> = new Set();

  public static coordKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  public addRoom(room: ScreenData): void {
    const key = LevelMap.coordKey(room.coords.x, room.coords.y);
    this.rooms.set(key, room);
  }

  public getRoom(x: number, y: number): ScreenData | undefined {
    return this.rooms.get(LevelMap.coordKey(x, y));
  }

  public hasRoom(x: number, y: number): boolean {
    return this.rooms.has(LevelMap.coordKey(x, y));
  }

  public markVisited(x: number, y: number): void {
    this.visitedCoordinates.add(LevelMap.coordKey(x, y));
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

  protected isDynamicMap(): boolean {
    return false;
  }
}
