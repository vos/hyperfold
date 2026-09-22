"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProceduralWorldGen = exports.BIOMES = void 0;
const ScreenData_1 = require("./ScreenData");

exports.BIOMES = [
  {
    id: 'cyan_matrix',
    name: 'Cyan Matrix',
    themeColor: '#00ffff',
    accentColor: '#0088ff',
    titles: ['Cyan Matrix', 'Grid Core', 'Neon Concourse', 'Data Nexus', 'Pulse Expanse'],
    subtitles: [
      'Standard non-Euclidean sector. Synchronized hyper-bus active.',
      'Data channels humming at baseline frequency.',
      'Hover cruisers and harmonic platforms operational.',
    ],
  },
  {
    id: 'solar_flare',
    name: 'Solar Flare',
    themeColor: '#ff6600',
    accentColor: '#ff0055',
    titles: ['Solar Vault', 'Thermal Matrix', 'Ignition Chamber', 'Flare Bastion', 'Plasma Siphon'],
    subtitles: [
      'High thermal energy detected. Laser defense turrets active.',
      'Dynamic beam conductors charged and cycling.',
      'Energy coils overheating across adjacent faces.',
    ],
  },
  {
    id: 'cryo_abyss',
    name: 'Cryo Abyss',
    themeColor: '#00ccff',
    accentColor: '#0033cc',
    titles: ['Cryo Abyss', 'Glacial Chasm', 'Sub-Zero Spire', 'Frost Core', 'Absolute Zero'],
    subtitles: [
      'Subterranean vacuum chamber. Super Bounce pads engaged.',
      'Gravitational fluctuations detected in vertical chute.',
      'Low friction atmospheric layer synchronized.',
    ],
  },
  {
    id: 'toxic_overdrive',
    name: 'Toxic Overdrive',
    themeColor: '#39ff14',
    accentColor: '#ffe600',
    titles: ['Acid Conduit', 'Toxic Siphon', 'Verdant Core', 'Hazard Grid', 'Radiation Vault'],
    subtitles: [
      'Structural instability detected. Crumble platforms active.',
      'Radioactive floor spikes detected beneath platform gaps.',
      'Duck to slide under low overhead defense rails.',
    ],
  },
  {
    id: 'void_horizon',
    name: 'Void Horizon',
    themeColor: '#ff00aa',
    accentColor: '#9900ff',
    titles: ['Void Horizon', 'Dark Matter Node', 'Tesseract Crypt', 'Singularity Core', 'Null Space'],
    subtitles: [
      'Non-Euclidean distortion high. Mobile laser barriers patrolling.',
      'Tesseract boundary shear approaching critical threshold.',
      'Deep cosmic void detected beyond perimeter walls.',
    ],
  },
];

class ProceduralWorldGen {
  baseSeedNumber;

  constructor(seed = 'HYPERFOLD') {
    this.baseSeedNumber = typeof seed === 'number' ? seed : ProceduralWorldGen.hashString(seed);
  }

  static hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }

  createRng(seed) {
    let s = seed >>> 0;
    return () => {
      let t = (s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  static getDifficultyMultiplier(difficulty) {
    switch (difficulty) {
      case 'easy':
        return 0.04;
      case 'normal':
        return 0.10;
      case 'hard':
        return 0.22;
      case 'impossible':
        return 0.42;
      default:
        return 0.10;
    }
  }

  getThreatLevel(x, y, difficulty) {
    const depth = Math.abs(x) + Math.abs(y);
    if (depth === 0) return 0;
    const mult = ProceduralWorldGen.getDifficultyMultiplier(difficulty);
    return Math.min(1.0, depth * mult);
  }

  getBiome(x, y) {
    const coordHash = (this.baseSeedNumber ^ ProceduralWorldGen.hashString(`${x},${y}:biome`)) >>> 0;
    const idx = coordHash % exports.BIOMES.length;
    return exports.BIOMES[idx];
  }

  resolveExits(x, y, neighbors) {
    const rng = this.createRng((this.baseSeedNumber ^ ProceduralWorldGen.hashString(`${x},${y}:exits`)) >>> 0);

    const exits = {
      left: false,
      right: false,
      up: false,
      down: false,
    };

    const locked = {};

    if (neighbors.left) {
      exits.left = neighbors.left.right;
      locked.left = true;
    }
    if (neighbors.right) {
      exits.right = neighbors.right.left;
      locked.right = true;
    }
    if (neighbors.up) {
      exits.up = neighbors.up.down;
      locked.up = true;
    }
    if (neighbors.down) {
      exits.down = neighbors.down.up;
      locked.down = true;
    }

    const directions = ['right', 'left', 'up', 'down'];
    const unlockedDirections = directions.filter((d) => !locked[d]);

    for (let i = unlockedDirections.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [unlockedDirections[i], unlockedDirections[j]] = [unlockedDirections[j], unlockedDirections[i]];
    }

    let openCount = directions.filter((d) => exits[d]).length;
    const minNeeded = openCount === 0 ? 2 : openCount + 1;

    for (const dir of unlockedDirections) {
      if (openCount < minNeeded) {
        exits[dir] = true;
        openCount++;
      } else {
        if (rng() < 0.45) {
          exits[dir] = true;
          openCount++;
        }
      }
    }

    if (openCount < 2 && unlockedDirections.length > 0) {
      for (const dir of unlockedDirections) {
        if (!exits[dir]) {
          exits[dir] = true;
          openCount++;
          if (openCount >= 2) break;
        }
      }
    }

    return exits;
  }

  findSafeSpawnPoint(grid, exits) {
    const priorityCols = exits.left ? [1, 2, 3] : exits.down ? [2, 3, 16, 17] : [1, 2, 3, 16, 17];

    for (const c of priorityCols) {
      if (
        (grid[17][c] === ScreenData_1.TileType.SOLID || grid[17][c] === ScreenData_1.TileType.ONE_WAY) &&
        grid[16][c] === ScreenData_1.TileType.EMPTY &&
        grid[15][c] === ScreenData_1.TileType.EMPTY &&
        grid[18][c] !== ScreenData_1.TileType.SPIKE
      ) {
        return { x: c * 40 + 20, y: 16 * 40 };
      }
    }

    for (let c = 1; c < 19; c++) {
      if (
        (grid[17][c] === ScreenData_1.TileType.SOLID || grid[17][c] === ScreenData_1.TileType.ONE_WAY) &&
        grid[16][c] === ScreenData_1.TileType.EMPTY &&
        grid[15][c] === ScreenData_1.TileType.EMPTY &&
        grid[18][c] !== ScreenData_1.TileType.SPIKE
      ) {
        return { x: c * 40 + 20, y: 16 * 40 };
      }
    }

    grid[17][1] = ScreenData_1.TileType.SOLID;
    grid[16][1] = ScreenData_1.TileType.EMPTY;
    grid[15][1] = ScreenData_1.TileType.EMPTY;
    return { x: 60, y: 640 };
  }

  generateRoom(x, y, difficulty, neighbors = {}) {
    const roomSeed = (this.baseSeedNumber ^ ProceduralWorldGen.hashString(`${x},${y}`)) >>> 0;
    const rng = this.createRng(roomSeed);

    const depth = Math.abs(x) + Math.abs(y);
    const threat = this.getThreatLevel(x, y, difficulty);
    const biome = this.getBiome(x, y);
    const exits = this.resolveExits(x, y, neighbors);

    const isGenesis = depth === 0;
    const isSanctuary = !isGenesis && depth > 0 && depth % 8 === 0;

    const ARCHETYPES = [
      'ARCHIPELAGO_PILLARS',
      'CAVERN_CHASM',
      'MULTI_TIER_FORTRESS',
      'VERTICAL_ASCENSION',
      'SECURITY_GRID',
      'CRUMBLE_EXPEDITION',
      'TRANSIT_RAILWAY',
      'BOUNCE_CATHEDRAL',
    ];
    const archetype = isGenesis ? 'MULTI_TIER_FORTRESS' : ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)];

    let title;
    let subtitle;

    if (isGenesis) {
      title = `Sector [0, 0]: Genesis Nexus`;
      subtitle = `Infinite hypercube manifold initialized. Difficulty: ${difficulty.toUpperCase()}.`;
    } else if (isSanctuary) {
      title = `Sector [${x}, ${y}]: Power Sanctuary`;
      subtitle = `Dimensional stabilization node. All lethal hazards neutralized. Energy recharge active.`;
    } else {
      const archetypeNames = {
        ARCHIPELAGO_PILLARS: ['Monolith Reach', 'Pillar Expanse', 'Spire Ridge', 'Obelisk Void'],
        CAVERN_CHASM: ['Abyssal Trench', 'Chasm Fault', 'Fissure Core', 'Hollow Rift'],
        MULTI_TIER_FORTRESS: ['Bastion Citadel', 'Rampart Tier', 'Iron Redoubt', 'Bulkhead Ward'],
        VERTICAL_ASCENSION: ['Zenith Tower', 'Ascent Spire', 'Skyward Chute', 'Apex Shaft'],
        SECURITY_GRID: ['Defense Grid', 'Security Matrix', 'Sentinel Vault', 'Firewall Concourse'],
        CRUMBLE_EXPEDITION: ['Unstable Span', 'Tremor Ruin', 'Collapse Ledge', 'Seismic Vault'],
        TRANSIT_RAILWAY: ['Cruiser Transit', 'Hover Crossing', 'Vector Railway', 'Harmonic Depot'],
        BOUNCE_CATHEDRAL: ['Kinetic Launch', 'Velocity Nave', 'Impulse Chasm', 'Bounce Atrium'],
      };
      const names = archetypeNames[archetype];
      const selectedName = names[Math.floor(rng() * names.length)];
      title = `Sector [${x}, ${y}]: ${selectedName}`;
      subtitle = biome.subtitles[Math.floor(rng() * biome.subtitles.length)];
    }

    const themeColor = isSanctuary ? '#ffe600' : biome.themeColor;
    const accentColor = isSanctuary ? '#00ffaa' : biome.accentColor;

    const grid = [];
    for (let r = 0; r < ScreenData_1.ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < ScreenData_1.COLS; c++) {
        grid[r][c] = ScreenData_1.TileType.EMPTY;
      }
    }

    const bounceProps = {};
    const spikeProps = {};
    const movingPlatforms = [];
    const laserBarriers = [];
    const laserTurrets = [];
    const collectibles = [];

    // Outer Border
    for (let c = 0; c < ScreenData_1.COLS; c++) {
      if (exits.up && c >= 8 && c <= 11) {
        grid[0][c] = ScreenData_1.TileType.EMPTY;
      } else {
        grid[0][c] = ScreenData_1.TileType.SOLID;
      }
    }

    for (let c = 0; c < ScreenData_1.COLS; c++) {
      if (exits.down && c >= 8 && c <= 11) {
        grid[18][c] = ScreenData_1.TileType.EMPTY;
        grid[19][c] = ScreenData_1.TileType.EMPTY;
      } else {
        grid[18][c] = ScreenData_1.TileType.SOLID;
        grid[19][c] = ScreenData_1.TileType.SOLID;
      }
    }

    for (let r = 1; r < 18; r++) {
      if (exits.left && r >= 14 && r <= 16) {
        grid[r][0] = ScreenData_1.TileType.EMPTY;
      } else {
        grid[r][0] = ScreenData_1.TileType.SOLID;
      }
    }
    grid[17][0] = ScreenData_1.TileType.SOLID;
    grid[17][1] = ScreenData_1.TileType.SOLID;
    grid[17][2] = ScreenData_1.TileType.SOLID;

    for (let r = 1; r < 18; r++) {
      if (exits.right && r >= 14 && r <= 16) {
        grid[r][19] = ScreenData_1.TileType.EMPTY;
      } else {
        grid[r][19] = ScreenData_1.TileType.SOLID;
      }
    }
    grid[17][17] = ScreenData_1.TileType.SOLID;
    grid[17][18] = ScreenData_1.TileType.SOLID;
    grid[17][19] = ScreenData_1.TileType.SOLID;

    // Archetype terrain
    if (isGenesis) {
      for (let c = 3; c < 17; c++) grid[17][c] = ScreenData_1.TileType.SOLID;
      for (let c = 4; c <= 8; c++) grid[14][c] = ScreenData_1.TileType.ONE_WAY;
      for (let c = 11; c <= 15; c++) grid[14][c] = ScreenData_1.TileType.ONE_WAY;
      for (let c = 7; c <= 12; c++) grid[11][c] = ScreenData_1.TileType.SOLID;
    } else if (isSanctuary) {
      for (let c = 3; c < 17; c++) grid[17][c] = ScreenData_1.TileType.SOLID;
      for (let c = 7; c <= 12; c++) grid[15][c] = ScreenData_1.TileType.SOLID;
      for (let c = 8; c <= 11; c++) grid[13][c] = ScreenData_1.TileType.SOLID;
      for (let c = 3; c <= 6; c++) grid[13][c] = ScreenData_1.TileType.ONE_WAY;
      for (let c = 13; c <= 16; c++) grid[13][c] = ScreenData_1.TileType.ONE_WAY;
    } else {
      switch (archetype) {
        case 'ARCHIPELAGO_PILLARS': {
          grid[17][1] = ScreenData_1.TileType.SOLID;
          grid[17][2] = ScreenData_1.TileType.SOLID;

          grid[16][3] = ScreenData_1.TileType.SOLID;
          grid[16][4] = ScreenData_1.TileType.SOLID;
          grid[17][3] = ScreenData_1.TileType.SOLID;
          grid[17][4] = ScreenData_1.TileType.SOLID;

          for (let r = 14; r <= 17; r++) {
            grid[r][5] = ScreenData_1.TileType.SOLID;
            grid[r][6] = ScreenData_1.TileType.SOLID;
          }

          grid[13][7] = ScreenData_1.TileType.ONE_WAY;
          grid[13][8] = ScreenData_1.TileType.ONE_WAY;

          if (exits.down) {
            grid[14][9] = ScreenData_1.TileType.ONE_WAY;
            grid[14][10] = ScreenData_1.TileType.ONE_WAY;
          } else {
            for (let r = 12; r <= 17; r++) {
              grid[r][9] = ScreenData_1.TileType.SOLID;
              grid[r][10] = ScreenData_1.TileType.SOLID;
            }
          }

          grid[13][11] = ScreenData_1.TileType.ONE_WAY;
          grid[13][12] = ScreenData_1.TileType.ONE_WAY;

          for (let r = 14; r <= 17; r++) {
            grid[r][13] = ScreenData_1.TileType.SOLID;
            grid[r][14] = ScreenData_1.TileType.SOLID;
          }

          grid[16][15] = ScreenData_1.TileType.SOLID;
          grid[16][16] = ScreenData_1.TileType.SOLID;
          grid[17][15] = ScreenData_1.TileType.SOLID;
          grid[17][16] = ScreenData_1.TileType.SOLID;

          grid[17][17] = ScreenData_1.TileType.SOLID;
          grid[17][18] = ScreenData_1.TileType.SOLID;

          if (!exits.down && threat >= 0.35) {
            grid[18][7] = ScreenData_1.TileType.SPIKE;
            spikeProps['18,7'] = { direction: 'up' };
            grid[18][12] = ScreenData_1.TileType.SPIKE;
            spikeProps['18,12'] = { direction: 'up' };
          }

          for (let c = 7; c <= 12; c++) grid[8][c] = ScreenData_1.TileType.ONE_WAY;
          break;
        }

        case 'CAVERN_CHASM': {
          for (let c = 0; c <= 5; c++) grid[17][c] = ScreenData_1.TileType.SOLID;
          for (let c = 14; c <= 19; c++) grid[17][c] = ScreenData_1.TileType.SOLID;

          grid[16][7] = ScreenData_1.TileType.SOLID;
          grid[16][8] = ScreenData_1.TileType.SOLID;
          grid[15][9] = ScreenData_1.TileType.ONE_WAY;
          grid[15][10] = ScreenData_1.TileType.ONE_WAY;
          grid[16][11] = ScreenData_1.TileType.SOLID;
          grid[16][12] = ScreenData_1.TileType.SOLID;

          if (threat >= 0.3) {
            movingPlatforms.push({
              id: `chasm_cruiser_${x}_${y}`,
              startX: 240,
              startY: 520,
              endX: 520,
              endY: 520,
              width: 88,
              speed: 130,
              pauseTime: 0.4,
              themeColor: accentColor,
              oneWay: true,
            });
          }

          if (!exits.down) {
            for (let c = 6; c <= 13; c++) {
              grid[18][c] = ScreenData_1.TileType.SPIKE;
              spikeProps[`18,${c}`] = { direction: 'up' };
            }
          }
          break;
        }

        case 'MULTI_TIER_FORTRESS': {
          for (let c = 1; c < 19; c++) {
            if (!(exits.down && c >= 8 && c <= 11)) grid[17][c] = ScreenData_1.TileType.SOLID;
          }

          grid[15][3] = ScreenData_1.TileType.SOLID;
          grid[15][4] = ScreenData_1.TileType.SOLID;
          grid[15][15] = ScreenData_1.TileType.SOLID;
          grid[15][16] = ScreenData_1.TileType.SOLID;

          for (let c = 5; c <= 8; c++) grid[13][c] = ScreenData_1.TileType.ONE_WAY;
          for (let c = 11; c <= 14; c++) grid[13][c] = ScreenData_1.TileType.ONE_WAY;
          for (let c = 7; c <= 12; c++) grid[10][c] = ScreenData_1.TileType.SOLID;
          break;
        }

        case 'VERTICAL_ASCENSION': {
          for (let c = 1; c < 19; c++) {
            if (!(exits.down && c >= 8 && c <= 11)) grid[17][c] = ScreenData_1.TileType.SOLID;
          }
          for (let c = 2; c <= 6; c++) grid[15][c] = ScreenData_1.TileType.ONE_WAY;
          for (let c = 7; c <= 12; c++) grid[13][c] = ScreenData_1.TileType.ONE_WAY;
          for (let c = 13; c <= 17; c++) grid[11][c] = ScreenData_1.TileType.ONE_WAY;
          for (let c = 7; c <= 12; c++) grid[9][c] = ScreenData_1.TileType.ONE_WAY;
          for (let c = 2; c <= 6; c++) grid[7][c] = ScreenData_1.TileType.ONE_WAY;
          for (let c = 7; c <= 12; c++) grid[5][c] = ScreenData_1.TileType.SOLID;
          break;
        }

        case 'SECURITY_GRID': {
          for (let c = 1; c < 19; c++) {
            if (!(exits.down && c >= 8 && c <= 11)) grid[17][c] = ScreenData_1.TileType.SOLID;
          }
          for (let r = 7; r <= 13; r++) {
            grid[r][6] = ScreenData_1.TileType.SOLID;
            grid[r][13] = ScreenData_1.TileType.SOLID;
          }
          for (let c = 7; c <= 12; c++) grid[14][c] = ScreenData_1.TileType.ONE_WAY;
          for (let c = 8; c <= 11; c++) grid[11][c] = ScreenData_1.TileType.SOLID;
          break;
        }

        case 'CRUMBLE_EXPEDITION': {
          for (let c = 0; c <= 3; c++) grid[17][c] = ScreenData_1.TileType.SOLID;
          for (let c = 16; c <= 19; c++) grid[17][c] = ScreenData_1.TileType.SOLID;

          for (let c = 4; c <= 15; c++) {
            if (exits.down && c >= 8 && c <= 11) {
              grid[17][c] = ScreenData_1.TileType.EMPTY;
            } else if (c === 6 || c === 9 || c === 10 || c === 13) {
              grid[17][c] = ScreenData_1.TileType.SOLID;
            } else {
              grid[17][c] = ScreenData_1.TileType.CRUMBLE;
              if (threat >= 0.35) {
                grid[18][c] = ScreenData_1.TileType.SPIKE;
                spikeProps[`18,${c}`] = { direction: 'up' };
              }
            }
          }
          for (let c = 5; c <= 8; c++) grid[14][c] = ScreenData_1.TileType.ONE_WAY;
          for (let c = 11; c <= 14; c++) grid[14][c] = ScreenData_1.TileType.ONE_WAY;
          break;
        }

        case 'TRANSIT_RAILWAY': {
          for (let c = 0; c <= 4; c++) grid[17][c] = ScreenData_1.TileType.SOLID;
          for (let c = 15; c <= 19; c++) grid[17][c] = ScreenData_1.TileType.SOLID;

          grid[16][5] = ScreenData_1.TileType.SOLID;
          grid[16][14] = ScreenData_1.TileType.SOLID;

          if (!exits.down) {
            for (let c = 6; c <= 13; c++) {
              grid[18][c] = ScreenData_1.TileType.SPIKE;
              spikeProps[`18,${c}`] = { direction: 'up' };
            }
          }

          movingPlatforms.push({
            id: `railway_low_${x}_${y}`,
            startX: 200,
            startY: 600,
            endX: 440,
            endY: 600,
            width: 88,
            speed: 130 + threat * 50,
            pauseTime: 0.35,
            initialProgress: 0,
            themeColor: accentColor,
            oneWay: true,
          });

          movingPlatforms.push({
            id: `railway_high_${x}_${y}`,
            startX: 360,
            startY: 420,
            endX: 600,
            endY: 420,
            width: 88,
            speed: 130 + threat * 50,
            pauseTime: 0.35,
            initialProgress: 0.5,
            themeColor: themeColor,
            oneWay: true,
          });

          grid[14][9] = ScreenData_1.TileType.SOLID;
          grid[14][10] = ScreenData_1.TileType.SOLID;
          break;
        }

        case 'BOUNCE_CATHEDRAL': {
          for (let c = 1; c < 19; c++) {
            if (!(exits.down && c >= 8 && c <= 11)) grid[17][c] = ScreenData_1.TileType.SOLID;
          }

          grid[17][5] = ScreenData_1.TileType.BOUNCE;
          bounceProps['17,5'] = { vy: -1250, vx: 200 };

          grid[17][14] = ScreenData_1.TileType.BOUNCE;
          bounceProps['17,14'] = { vy: -1250, vx: -200 };

          for (let c = 3; c <= 4; c++) grid[15][c] = ScreenData_1.TileType.ONE_WAY;
          for (let c = 15; c <= 16; c++) grid[15][c] = ScreenData_1.TileType.ONE_WAY;
          for (let c = 7; c <= 12; c++) grid[12][c] = ScreenData_1.TileType.SOLID;
          for (let c = 8; c <= 11; c++) grid[8][c] = ScreenData_1.TileType.ONE_WAY;
          break;
        }
      }
    }

    // Vertical Routing
    if (exits.up) {
      const useBounce = rng() < 0.65;
      if (useBounce || threat < 0.4) {
        grid[17][9] = ScreenData_1.TileType.BOUNCE;
        grid[17][10] = ScreenData_1.TileType.BOUNCE;
        bounceProps['17,9'] = { vy: -1450 };
        bounceProps['17,10'] = { vy: -1450 };
        for (let r = 1; r <= 16; r++) {
          for (let c = 8; c <= 11; c++) {
            grid[r][c] = ScreenData_1.TileType.EMPTY;
          }
        }
      } else {
        movingPlatforms.push({
          id: `spire_elevator_${x}_${y}`,
          startX: 360,
          startY: 640,
          endX: 360,
          endY: 80,
          width: 80,
          speed: 160 + threat * 80,
          pauseTime: 0.5,
          themeColor,
          oneWay: true,
        });
      }
    }

    if (exits.down) {
      grid[17][7] = ScreenData_1.TileType.SOLID;
      grid[17][12] = ScreenData_1.TileType.SOLID;
      grid[15][8] = ScreenData_1.TileType.ONE_WAY;
      grid[15][11] = ScreenData_1.TileType.ONE_WAY;
    }

    // Dynamic Hazards
    if (!isGenesis && !isSanctuary) {
      if (threat >= 0.35) {
        const barrierStyle = Math.floor(rng() * 2);
        const warningTime = Math.max(0.45, 0.85 - threat * 0.4);
        const activeTime = 1.2 + threat * 0.6;
        const inactiveTime = Math.max(1.8, 3.2 - threat * 1.0);

        if (barrierStyle === 0) {
          const bx = threat > 0.6 ? 320 : 480;
          laserBarriers.push({
            id: `barrier_v_${x}_${y}`,
            startX1: bx,
            startY1: 180,
            startX2: bx,
            startY2: 600,
            activeDuration: activeTime,
            inactiveDuration: inactiveTime,
            warningDuration: warningTime,
            initialPhase: rng() * 0.5,
            themeColor: '#ff0055',
            width: 4,
          });
        } else {
          laserBarriers.push({
            id: `barrier_m_${x}_${y}`,
            startX1: 240,
            startY1: 200,
            startX2: 240,
            startY2: 580,
            endX1: 560,
            endY1: 200,
            endX2: 560,
            endY2: 580,
            speed: 90 + threat * 50,
            activeDuration: activeTime,
            inactiveDuration: inactiveTime,
            warningDuration: warningTime,
            initialPhase: rng() * 0.5,
            themeColor: '#ff0055',
            width: 4,
          });
        }
      }

      if (threat >= 0.48) {
        const isBeam = threat >= 0.75 && rng() < 0.45;
        const mountRight = rng() < 0.5;
        const tx = mountRight ? 760 : 40;
        const ty = 300 + Math.floor(rng() * 120);
        const dir = mountRight ? 'left' : 'right';

        if (isBeam) {
          laserTurrets.push({
            id: `turret_w_${x}_${y}`,
            x: tx,
            y: ty,
            direction: dir,
            mode: 'beam',
            activeDuration: 1.8 + threat * 0.4,
            inactiveDuration: Math.max(2.0, 3.4 - threat * 1.0),
            warningDuration: Math.max(0.55, 0.85 - threat * 0.3),
            initialPhase: rng() * 0.4,
            themeColor: '#00ffff',
          });
        } else {
          laserTurrets.push({
            id: `turret_w_${x}_${y}`,
            x: tx,
            y: ty,
            direction: dir,
            mode: 'projectile',
            projectileSpeed: 200 + threat * 120,
            fireInterval: Math.max(2.0, 3.6 - threat * 1.0),
            fireOffset: rng() * 1.0,
            themeColor: '#ff0055',
          });
        }
      }
    }

    // Collectibles
    const prismCount = isSanctuary ? 5 : isGenesis ? 3 : Math.floor(2 + rng() * 3);
    const prismYPositions = [480, 400, 300, 220, 160];

    for (let i = 0; i < prismCount; i++) {
      const px = 160 + ((i + 1) * (ScreenData_1.FACE_SIZE - 320)) / (prismCount + 1);
      const py = prismYPositions[i % prismYPositions.length];
      collectibles.push({
        id: `prism_${x}_${y}_${i}`,
        type: i === 0 || isSanctuary ? 'prism' : 'core',
        x: Math.round(px),
        y: Math.round(py),
      });
    }

    const spawnPoint = this.findSafeSpawnPoint(grid, exits);

    return {
      id: `room_${x}_${y}`,
      coords: { x, y },
      title,
      subtitle,
      themeColor,
      accentColor,
      tiles: grid,
      collectibles,
      exits,
      spawnPoint,
      bounceProps: Object.keys(bounceProps).length > 0 ? bounceProps : undefined,
      spikeProps: Object.keys(spikeProps).length > 0 ? spikeProps : undefined,
      movingPlatforms: movingPlatforms.length > 0 ? movingPlatforms : undefined,
      laserBarriers: laserBarriers.length > 0 ? laserBarriers : undefined,
      laserTurrets: laserTurrets.length > 0 ? laserTurrets : undefined,
    };
  }
}
exports.ProceduralWorldGen = ProceduralWorldGen;
