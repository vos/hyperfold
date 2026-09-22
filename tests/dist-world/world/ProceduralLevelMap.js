"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProceduralLevelMap = void 0;
const LevelMap_1 = require("./LevelMap");
const ProceduralWorldGen_1 = require("./ProceduralWorldGen");

class ProceduralLevelMap extends LevelMap_1.LevelMap {
  generator;
  difficulty;
  seed;
  maxDepthReached = 0;
  clearedStreak = 0;

  constructor(difficulty = 'normal', seed = 'HYPERFOLD') {
    super();
    this.difficulty = difficulty;
    this.seed = seed;
    this.generator = new ProceduralWorldGen_1.ProceduralWorldGen(seed);

    const genesis = this.generator.generateRoom(0, 0, this.difficulty, {});
    this.addRoom(genesis);
    this.markVisited(0, 0);
  }

  getDifficulty() {
    return this.difficulty;
  }

  getSeed() {
    return this.seed;
  }

  getThreatLevel(x, y) {
    return this.generator.getThreatLevel(x, y, this.difficulty);
  }

  getClearedStreak() {
    return this.clearedStreak;
  }

  getMaxDepthReached() {
    return this.maxDepthReached;
  }

  markVisited(x, y) {
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

  getRoom(x, y, forceGenerate = false) {
    const existing = super.getRoom(x, y);
    if (existing) {
      return existing;
    }

    const leftNeighbor = super.getRoom(x - 1, y);
    const rightNeighbor = super.getRoom(x + 1, y);
    const upNeighbor = super.getRoom(x, y + 1);
    const downNeighbor = super.getRoom(x, y - 1);

    const neighborExits = {};
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

    if (hasIncomingExit || forceGenerate) {
      const newRoom = this.generator.generateRoom(x, y, this.difficulty, neighborExits);
      this.addRoom(newRoom);
      return newRoom;
    }

    return undefined;
  }
}
exports.ProceduralLevelMap = ProceduralLevelMap;

