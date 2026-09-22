import { LevelMap } from './LevelMap';
import { ScreenData, RoomExits } from './ScreenData';
import { ProceduralWorldGen, DifficultyLevel } from './ProceduralWorldGen';

export class ProceduralLevelMap extends LevelMap {
  private generator: ProceduralWorldGen;
  private difficulty: DifficultyLevel;
  private seed: string | number;
  private maxDepthReached: number = 0;
  private clearedStreak: number = 0;

  constructor(difficulty: DifficultyLevel = 'normal', seed: string | number = 'HYPERFOLD') {
    super();
    this.difficulty = difficulty;
    this.seed = seed;
    this.generator = new ProceduralWorldGen(seed);

    // Automatically synthesize starting Genesis Core at (0, 0)
    const genesis = this.generator.generateRoom(0, 0, this.difficulty, {});
    this.addRoom(genesis);
    this.markVisited(0, 0);
  }

  public getDifficulty(): DifficultyLevel {
    return this.difficulty;
  }

  public getSeed(): string | number {
    return this.seed;
  }

  public getThreatLevel(x: number, y: number): number {
    return this.generator.getThreatLevel(x, y, this.difficulty);
  }

  public getClearedStreak(): number {
    return this.clearedStreak;
  }

  public getMaxDepthReached(): number {
    return this.maxDepthReached;
  }

  /**
   * Records that player has entered (x, y). Updates depth, streak, and visited state.
   */
  public override markVisited(x: number, y: number): void {
    const wasAlreadyVisited = this.isVisited(x, y);
    super.markVisited(x, y);

    const depth = Math.abs(x) + Math.abs(y);
    if (depth > this.maxDepthReached) {
      this.maxDepthReached = depth;
    }

    if (!wasAlreadyVisited && (x !== 0 || y !== 0)) {
      this.clearedStreak++;
    }
  }

  /**
   * Retrieves room at (x, y).
   * If already generated, returns the cached room.
   * If not generated, checks if any adjacent room connects to (x, y).
   * If an open exit connects to (x, y), generates it on-demand with matching apertures and caches it!
   */
  public override getRoom(x: number, y: number, forceGenerate: boolean = false): ScreenData | undefined {
    const existing = super.getRoom(x, y);
    if (existing) {
      return existing;
    }

    // Inspect all 4 orthogonal neighbors
    const leftNeighbor = super.getRoom(x - 1, y);
    const rightNeighbor = super.getRoom(x + 1, y);
    const upNeighbor = super.getRoom(x, y + 1);
    const downNeighbor = super.getRoom(x, y - 1);

    const neighborExits: {
      left?: RoomExits;
      right?: RoomExits;
      up?: RoomExits;
      down?: RoomExits;
    } = {};

    let hasIncomingExit = false;

    if (leftNeighbor) {
      neighborExits.left = leftNeighbor.exits;
      if (leftNeighbor.exits.right) hasIncomingExit = true;
    }
    if (rightNeighbor) {
      neighborExits.right = rightNeighbor.exits;
      if (rightNeighbor.exits.left) hasIncomingExit = true;
    }
    if (upNeighbor) {
      neighborExits.up = upNeighbor.exits;
      if (upNeighbor.exits.down) hasIncomingExit = true;
    }
    if (downNeighbor) {
      neighborExits.down = downNeighbor.exits;
      if (downNeighbor.exits.up) hasIncomingExit = true;
    }

    // Only synthesize room if there is an incoming pathway from an existing neighbor or forced
    if (hasIncomingExit || forceGenerate) {
      const newRoom = this.generator.generateRoom(x, y, this.difficulty, neighborExits);
      this.addRoom(newRoom);
      return newRoom;
    }

    return undefined;
  }
}

