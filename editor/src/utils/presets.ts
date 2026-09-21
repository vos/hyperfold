import type { WorldData } from '../types/world.ts';
import { createEmptyWorld, parseWorldJson } from './serialization.ts';

const MINI_WORLD_JSON = JSON.stringify({
  "$schema": "./schemas/world.schema.json",
  "id": "mini",
  "title": "Mini Hypercube (3 Sectors)",
  "description": "A compact 3-room standalone world demonstrating the single-file format with inlined rooms, ASCII layouts, and dynamic hazards.",
  "startingCoords": [0, 0],
  "rooms": [
    {
      "$schema": "./schemas/room.schema.json",
      "id": "mini_0_0",
      "coords": [0, 0],
      "title": "Sector 0: Neon Bastion",
      "subtitle": "Welcome to the Hypercube. Leap across crumble stepping stones and dodge the pulse turret!",
      "themeColor": "#00e5ff",
      "accentColor": "#0066ff",
      "exits": { "left": false, "right": true, "up": false, "down": false },
      "spawnPoint": [180, 600],
      "grid": [
        "####################",
        "#  vvvv      vvvv  #",
        "#                  #",
        "#                  #",
        "#                  #",
        "#                  #",
        "#                  #",
        "#       ====       #",
        "#                  #",
        "#                  #",
        "#    ====  ====    #",
        "#                  #",
        "#  ====       ====  ",
        "#                   ",
        "#       CCCC        ",
        "#                   ",
        "#  ####       ####  ",
        "#BB    ^^^^^^    BB#",
        "####################",
        "####################"
      ],
      "collectibles": [
        { "id": "mini_core_0_0_1", "type": "core", "pos": [360, 480] },
        { "id": "mini_core_0_0_2", "type": "core", "pos": [440, 480] },
        { "id": "mini_prism_0_0_1", "type": "prism", "pos": [400, 240] }
      ],
      "laserTurrets": [
        {
          "id": "mini_turret_0_0_1",
          "x": 400,
          "y": 160,
          "direction": "down",
          "mode": "projectile",
          "fireInterval": 1.8,
          "projectileSpeed": 260,
          "themeColor": "#00e5ff"
        }
      ]
    },
    {
      "$schema": "./schemas/room.schema.json",
      "id": "mini_1_0",
      "coords": [1, 0],
      "title": "Sector 1: Kinetic Crucible",
      "subtitle": "Ride the hover cruisers across the chasm — watch for alternating ceiling beams!",
      "themeColor": "#d000ff",
      "accentColor": "#ff007f",
      "exits": { "left": true, "right": true, "up": false, "down": false },
      "spawnPoint": [120, 680],
      "grid": [
        "####################",
        "#   vvvv    vvvv   #",
        "#                  #",
        "#                  #",
        "#                  #",
        "#                  #",
        "#                  #",
        "#       ====       #",
        "#                  #",
        "#                  #",
        "#   ===      ===   #",
        "#                  #",
        "   ====      ====   ",
        "                    ",
        "  ====        ====  ",
        "                    ",
        "                    ",
        "#BB  ^^^^^^^^^^  BB#",
        "####################",
        "####################"
      ],
      "collectibles": [
        { "id": "mini_core_1_0_1", "type": "core", "pos": [220, 440] },
        { "id": "mini_core_1_0_2", "type": "core", "pos": [580, 440] },
        { "id": "mini_prism_1_0_1", "type": "prism", "pos": [400, 240] }
      ],
      "movingPlatforms": [
        {
          "id": "mini_plat_1_0_1",
          "startX": 180,
          "startY": 560,
          "endX": 540,
          "endY": 560,
          "width": 100,
          "height": 16,
          "speed": 110,
          "pauseTime": 0.4,
          "themeColor": "#d000ff"
        }
      ],
      "laserTurrets": [
        {
          "id": "mini_turret_1_0_1",
          "x": 260,
          "y": 40,
          "direction": "down",
          "mode": "beam",
          "activeDuration": 1.8,
          "inactiveDuration": 2.2,
          "warningDuration": 0.6,
          "initialPhase": 0,
          "themeColor": "#ff007f"
        },
        {
          "id": "mini_turret_1_0_2",
          "x": 540,
          "y": 40,
          "direction": "down",
          "mode": "beam",
          "activeDuration": 1.8,
          "inactiveDuration": 2.2,
          "warningDuration": 0.6,
          "initialPhase": 0.5,
          "themeColor": "#d000ff"
        }
      ]
    },
    {
      "$schema": "./schemas/room.schema.json",
      "id": "mini_2_0",
      "coords": [2, 0],
      "title": "Sector 2: Singularity Sanctum",
      "subtitle": "Super-bounce to the upper sanctuary and step into the Warp Portal to finish!",
      "themeColor": "#ffe600",
      "accentColor": "#00ff88",
      "exits": { "left": true, "right": false, "up": false, "down": false },
      "spawnPoint": [120, 680],
      "grid": [
        "####################",
        "#                  #",
        "#                  #",
        "#                  #",
        "#                  #",
        "#                  #",
        "#             G    #",
        "#          ####### #",
        "#                  #",
        "#       ====       #",
        "#                  #",
        "#    ====          #",
        "                   #",
        "                   #",
        "  ====        ==== #",
        "                   #",
        "                   #",
        "#BBBBBB            #",
        "####################",
        "####################"
      ],
      "bounceProps": {
        "17,1": { "vy": -1400 },
        "17,2": { "vy": -1400 },
        "17,3": { "vy": -1400 },
        "17,4": { "vy": -1400 },
        "17,5": { "vy": -1400 },
        "17,6": { "vy": -1400 }
      },
      "laserBarriers": [
        {
          "id": "mini_barrier_2_0_1",
          "startX1": 360,
          "startY1": 360,
          "startX2": 720,
          "startY2": 360,
          "activeDuration": 2.0,
          "inactiveDuration": 2.5,
          "warningDuration": 0.6,
          "themeColor": "#ffe600"
        }
      ],
      "collectibles": [
        { "id": "mini_core_2_0_1", "type": "core", "pos": [320, 320] },
        { "id": "mini_prism_2_0_1", "type": "prism", "pos": [600, 200] }
      ]
    }
  ]
});

import { getDemoWorld } from './demoWorldData.ts';

export const PRESET_WORLDS: { id: string; name: string; description: string; get: () => WorldData }[] = [
  {
    id: 'demo',
    name: 'Infinite Tesseract (10 Sectors - Demo Level)',
    description: 'Official 10-sector world traversing all faces of the 3D hypercube with full puzzles and hazards.',
    get: () => getDemoWorld(),
  },
  {
    id: 'mini',
    name: 'Mini Hypercube (3 Sectors)',
    description: '3-sector sample world with turrets, hover cruisers, bounce pads, and goal.',
    get: () => parseWorldJson(MINI_WORLD_JSON),
  },
  {
    id: 'blank',
    name: 'Blank Starter World (1 Sector)',
    description: 'Clean single sector with boundary walls, floor, spawn, and goal beacon.',
    get: () => createEmptyWorld(),
  },
];

