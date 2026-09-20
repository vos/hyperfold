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
}
