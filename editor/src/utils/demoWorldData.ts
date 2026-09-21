// Auto-generated built-in demo world data for Hyperfold World Editor
import type { RoomData, WorldData } from '../types/world.ts';
import { normalizeGrid } from './serialization.ts';

export const DEMO_WORLD_MANIFEST = {
  "$schema": "../../schemas/world.schema.json",
  "id": "demo",
  "title": "Infinite Tesseract (10 Sectors)",
  "description": "Traverse infinite sectors folded across the rotating faces of a 3D hypercube.",
  "startingCoords": [
    0,
    0
  ],
  "rooms": [
    "./rooms/room_0_0.json",
    "./rooms/room_1_0.json",
    "./rooms/room_2_0.json",
    "./rooms/room_3_0.json",
    "./rooms/room_4_0.json",
    "./rooms/room_5_0.json",
    "./rooms/room_6_0.json",
    "./rooms/room_2_1.json",
    "./rooms/room_2_2.json",
    "./rooms/room_4_-1.json"
  ]
};

export const DEMO_ROOMS_MAP: Record<string, any> = {
  "./rooms/room_0_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_0_0",
    "coords": [
      0,
      0
    ],
    "title": "Sector 0: Genesis Core",
    "subtitle": "Move with A/D, Jump with Space. Observe overhead laser beams and timing telegraphs!",
    "themeColor": "#00ffff",
    "accentColor": "#0088ff",
    "exits": {
      "left": false,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#             =====#",
      "#                   ",
      "#                   ",
      "#          ####     ",
      "#                   ",
      "#     ####      ####",
      "#                   ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_0_0_1",
        "type": "core",
        "pos": [
          280,
          500
        ]
      },
      {
        "id": "core_0_0_2",
        "type": "core",
        "pos": [
          500,
          420
        ]
      },
      {
        "id": "core_0_0_3",
        "type": "prism",
        "pos": [
          620,
          380
        ]
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_0_0_1",
        "x": 760,
        "y": 280,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.8,
        "initialPhase": 0.5,
        "themeColor": "#00ffff"
      }
    ]
  },
  "rooms/room_0_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_0_0",
    "coords": [
      0,
      0
    ],
    "title": "Sector 0: Genesis Core",
    "subtitle": "Move with A/D, Jump with Space. Observe overhead laser beams and timing telegraphs!",
    "themeColor": "#00ffff",
    "accentColor": "#0088ff",
    "exits": {
      "left": false,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#             =====#",
      "#                   ",
      "#                   ",
      "#          ####     ",
      "#                   ",
      "#     ####      ####",
      "#                   ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_0_0_1",
        "type": "core",
        "pos": [
          280,
          500
        ]
      },
      {
        "id": "core_0_0_2",
        "type": "core",
        "pos": [
          500,
          420
        ]
      },
      {
        "id": "core_0_0_3",
        "type": "prism",
        "pos": [
          620,
          380
        ]
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_0_0_1",
        "x": 760,
        "y": 280,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.8,
        "initialPhase": 0.5,
        "themeColor": "#00ffff"
      }
    ]
  },
  "room_0_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_0_0",
    "coords": [
      0,
      0
    ],
    "title": "Sector 0: Genesis Core",
    "subtitle": "Move with A/D, Jump with Space. Observe overhead laser beams and timing telegraphs!",
    "themeColor": "#00ffff",
    "accentColor": "#0088ff",
    "exits": {
      "left": false,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#             =====#",
      "#                   ",
      "#                   ",
      "#          ####     ",
      "#                   ",
      "#     ####      ####",
      "#                   ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_0_0_1",
        "type": "core",
        "pos": [
          280,
          500
        ]
      },
      {
        "id": "core_0_0_2",
        "type": "core",
        "pos": [
          500,
          420
        ]
      },
      {
        "id": "core_0_0_3",
        "type": "prism",
        "pos": [
          620,
          380
        ]
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_0_0_1",
        "x": 760,
        "y": 280,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.8,
        "initialPhase": 0.5,
        "themeColor": "#00ffff"
      }
    ]
  },
  "room_0_0": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_0_0",
    "coords": [
      0,
      0
    ],
    "title": "Sector 0: Genesis Core",
    "subtitle": "Move with A/D, Jump with Space. Observe overhead laser beams and timing telegraphs!",
    "themeColor": "#00ffff",
    "accentColor": "#0088ff",
    "exits": {
      "left": false,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#             =====#",
      "#                   ",
      "#                   ",
      "#          ####     ",
      "#                   ",
      "#     ####      ####",
      "#                   ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_0_0_1",
        "type": "core",
        "pos": [
          280,
          500
        ]
      },
      {
        "id": "core_0_0_2",
        "type": "core",
        "pos": [
          500,
          420
        ]
      },
      {
        "id": "core_0_0_3",
        "type": "prism",
        "pos": [
          620,
          380
        ]
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_0_0_1",
        "x": 760,
        "y": 280,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.8,
        "initialPhase": 0.5,
        "themeColor": "#00ffff"
      }
    ]
  },
  "./rooms/room_1_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_1_0",
    "coords": [
      1,
      0
    ],
    "title": "Sector 1: Neon Nexus",
    "subtitle": "Time your crossing through alternating ceiling beams — the hover sled blocks them!",
    "themeColor": "#ff00aa",
    "accentColor": "#ff0055",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#    vvvv  vvvv    #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>                <#",
      "#>                <#",
      "   ====      ====   ",
      "                    ",
      "                    ",
      "  ====        ====  ",
      "                    ",
      "                    ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_1_0_1",
        "type": "core",
        "pos": [
          200,
          420
        ]
      },
      {
        "id": "core_1_0_2",
        "type": "prism",
        "pos": [
          400,
          280
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_1_0_1",
        "startX": 180,
        "startY": 520,
        "endX": 560,
        "endY": 520,
        "width": 80,
        "height": 16,
        "speed": 110,
        "pauseTime": 0.5,
        "themeColor": "#00ffff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_1_0_1",
        "x": 260,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.6,
        "initialPhase": 0,
        "themeColor": "#ff00aa"
      },
      {
        "id": "turret_1_0_2",
        "x": 540,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#ff0055"
      }
    ]
  },
  "rooms/room_1_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_1_0",
    "coords": [
      1,
      0
    ],
    "title": "Sector 1: Neon Nexus",
    "subtitle": "Time your crossing through alternating ceiling beams — the hover sled blocks them!",
    "themeColor": "#ff00aa",
    "accentColor": "#ff0055",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#    vvvv  vvvv    #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>                <#",
      "#>                <#",
      "   ====      ====   ",
      "                    ",
      "                    ",
      "  ====        ====  ",
      "                    ",
      "                    ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_1_0_1",
        "type": "core",
        "pos": [
          200,
          420
        ]
      },
      {
        "id": "core_1_0_2",
        "type": "prism",
        "pos": [
          400,
          280
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_1_0_1",
        "startX": 180,
        "startY": 520,
        "endX": 560,
        "endY": 520,
        "width": 80,
        "height": 16,
        "speed": 110,
        "pauseTime": 0.5,
        "themeColor": "#00ffff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_1_0_1",
        "x": 260,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.6,
        "initialPhase": 0,
        "themeColor": "#ff00aa"
      },
      {
        "id": "turret_1_0_2",
        "x": 540,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#ff0055"
      }
    ]
  },
  "room_1_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_1_0",
    "coords": [
      1,
      0
    ],
    "title": "Sector 1: Neon Nexus",
    "subtitle": "Time your crossing through alternating ceiling beams — the hover sled blocks them!",
    "themeColor": "#ff00aa",
    "accentColor": "#ff0055",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#    vvvv  vvvv    #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>                <#",
      "#>                <#",
      "   ====      ====   ",
      "                    ",
      "                    ",
      "  ====        ====  ",
      "                    ",
      "                    ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_1_0_1",
        "type": "core",
        "pos": [
          200,
          420
        ]
      },
      {
        "id": "core_1_0_2",
        "type": "prism",
        "pos": [
          400,
          280
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_1_0_1",
        "startX": 180,
        "startY": 520,
        "endX": 560,
        "endY": 520,
        "width": 80,
        "height": 16,
        "speed": 110,
        "pauseTime": 0.5,
        "themeColor": "#00ffff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_1_0_1",
        "x": 260,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.6,
        "initialPhase": 0,
        "themeColor": "#ff00aa"
      },
      {
        "id": "turret_1_0_2",
        "x": 540,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#ff0055"
      }
    ]
  },
  "room_1_0": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_1_0",
    "coords": [
      1,
      0
    ],
    "title": "Sector 1: Neon Nexus",
    "subtitle": "Time your crossing through alternating ceiling beams — the hover sled blocks them!",
    "themeColor": "#ff00aa",
    "accentColor": "#ff0055",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#    vvvv  vvvv    #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>                <#",
      "#>                <#",
      "   ====      ====   ",
      "                    ",
      "                    ",
      "  ====        ====  ",
      "                    ",
      "                    ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_1_0_1",
        "type": "core",
        "pos": [
          200,
          420
        ]
      },
      {
        "id": "core_1_0_2",
        "type": "prism",
        "pos": [
          400,
          280
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_1_0_1",
        "startX": 180,
        "startY": 520,
        "endX": 560,
        "endY": 520,
        "width": 80,
        "height": 16,
        "speed": 110,
        "pauseTime": 0.5,
        "themeColor": "#00ffff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_1_0_1",
        "x": 260,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.6,
        "initialPhase": 0,
        "themeColor": "#ff00aa"
      },
      {
        "id": "turret_1_0_2",
        "x": 540,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#ff0055"
      }
    ]
  },
  "./rooms/room_2_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_0",
    "coords": [
      2,
      0
    ],
    "title": "Sector 2: Quantum Junction",
    "subtitle": "Time the Super Bounce Pad launch through the ceiling barrier, or climb the spire path!",
    "themeColor": "#00ff88",
    "accentColor": "#00cc66",
    "exits": {
      "left": true,
      "right": true,
      "up": true,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "#######      #######",
      "# vvv          vvv #",
      "#                  #",
      "#                  #",
      "#    ===    ===    #",
      "#                  #",
      "#                  #",
      "#   ====    ====   #",
      "#>                 #",
      "#>                 #",
      "#                  #",
      "#  ====      ====  #",
      "                    ",
      "                    ",
      "                  ^ ",
      "  ====        ######",
      "                    ",
      "        BBBB        ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_2_0_1",
        "type": "core",
        "pos": [
          400,
          400
        ]
      },
      {
        "id": "core_2_0_2",
        "type": "core",
        "pos": [
          620,
          480
        ]
      }
    ],
    "bounceProps": {
      "17,8": {
        "vy": -1550
      },
      "17,9": {
        "vy": -1550
      },
      "17,10": {
        "vy": -1550
      },
      "17,11": {
        "vy": -1550
      }
    },
    "laserBarriers": [
      {
        "id": "barrier_2_0_1",
        "startX1": 280,
        "startY1": 120,
        "startX2": 520,
        "startY2": 120,
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "themeColor": "#00ff88"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_0_1",
        "x": 760,
        "y": 200,
        "angle": 210,
        "mode": "projectile",
        "projectileSpeed": 240,
        "fireInterval": 2.6,
        "fireOffset": 0.8,
        "themeColor": "#00ff88"
      }
    ]
  },
  "rooms/room_2_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_0",
    "coords": [
      2,
      0
    ],
    "title": "Sector 2: Quantum Junction",
    "subtitle": "Time the Super Bounce Pad launch through the ceiling barrier, or climb the spire path!",
    "themeColor": "#00ff88",
    "accentColor": "#00cc66",
    "exits": {
      "left": true,
      "right": true,
      "up": true,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "#######      #######",
      "# vvv          vvv #",
      "#                  #",
      "#                  #",
      "#    ===    ===    #",
      "#                  #",
      "#                  #",
      "#   ====    ====   #",
      "#>                 #",
      "#>                 #",
      "#                  #",
      "#  ====      ====  #",
      "                    ",
      "                    ",
      "                  ^ ",
      "  ====        ######",
      "                    ",
      "        BBBB        ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_2_0_1",
        "type": "core",
        "pos": [
          400,
          400
        ]
      },
      {
        "id": "core_2_0_2",
        "type": "core",
        "pos": [
          620,
          480
        ]
      }
    ],
    "bounceProps": {
      "17,8": {
        "vy": -1550
      },
      "17,9": {
        "vy": -1550
      },
      "17,10": {
        "vy": -1550
      },
      "17,11": {
        "vy": -1550
      }
    },
    "laserBarriers": [
      {
        "id": "barrier_2_0_1",
        "startX1": 280,
        "startY1": 120,
        "startX2": 520,
        "startY2": 120,
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "themeColor": "#00ff88"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_0_1",
        "x": 760,
        "y": 200,
        "angle": 210,
        "mode": "projectile",
        "projectileSpeed": 240,
        "fireInterval": 2.6,
        "fireOffset": 0.8,
        "themeColor": "#00ff88"
      }
    ]
  },
  "room_2_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_0",
    "coords": [
      2,
      0
    ],
    "title": "Sector 2: Quantum Junction",
    "subtitle": "Time the Super Bounce Pad launch through the ceiling barrier, or climb the spire path!",
    "themeColor": "#00ff88",
    "accentColor": "#00cc66",
    "exits": {
      "left": true,
      "right": true,
      "up": true,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "#######      #######",
      "# vvv          vvv #",
      "#                  #",
      "#                  #",
      "#    ===    ===    #",
      "#                  #",
      "#                  #",
      "#   ====    ====   #",
      "#>                 #",
      "#>                 #",
      "#                  #",
      "#  ====      ====  #",
      "                    ",
      "                    ",
      "                  ^ ",
      "  ====        ######",
      "                    ",
      "        BBBB        ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_2_0_1",
        "type": "core",
        "pos": [
          400,
          400
        ]
      },
      {
        "id": "core_2_0_2",
        "type": "core",
        "pos": [
          620,
          480
        ]
      }
    ],
    "bounceProps": {
      "17,8": {
        "vy": -1550
      },
      "17,9": {
        "vy": -1550
      },
      "17,10": {
        "vy": -1550
      },
      "17,11": {
        "vy": -1550
      }
    },
    "laserBarriers": [
      {
        "id": "barrier_2_0_1",
        "startX1": 280,
        "startY1": 120,
        "startX2": 520,
        "startY2": 120,
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "themeColor": "#00ff88"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_0_1",
        "x": 760,
        "y": 200,
        "angle": 210,
        "mode": "projectile",
        "projectileSpeed": 240,
        "fireInterval": 2.6,
        "fireOffset": 0.8,
        "themeColor": "#00ff88"
      }
    ]
  },
  "room_2_0": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_0",
    "coords": [
      2,
      0
    ],
    "title": "Sector 2: Quantum Junction",
    "subtitle": "Time the Super Bounce Pad launch through the ceiling barrier, or climb the spire path!",
    "themeColor": "#00ff88",
    "accentColor": "#00cc66",
    "exits": {
      "left": true,
      "right": true,
      "up": true,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "#######      #######",
      "# vvv          vvv #",
      "#                  #",
      "#                  #",
      "#    ===    ===    #",
      "#                  #",
      "#                  #",
      "#   ====    ====   #",
      "#>                 #",
      "#>                 #",
      "#                  #",
      "#  ====      ====  #",
      "                    ",
      "                    ",
      "                  ^ ",
      "  ====        ######",
      "                    ",
      "        BBBB        ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_2_0_1",
        "type": "core",
        "pos": [
          400,
          400
        ]
      },
      {
        "id": "core_2_0_2",
        "type": "core",
        "pos": [
          620,
          480
        ]
      }
    ],
    "bounceProps": {
      "17,8": {
        "vy": -1550
      },
      "17,9": {
        "vy": -1550
      },
      "17,10": {
        "vy": -1550
      },
      "17,11": {
        "vy": -1550
      }
    },
    "laserBarriers": [
      {
        "id": "barrier_2_0_1",
        "startX1": 280,
        "startY1": 120,
        "startX2": 520,
        "startY2": 120,
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "themeColor": "#00ff88"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_0_1",
        "x": 760,
        "y": 200,
        "angle": 210,
        "mode": "projectile",
        "projectileSpeed": 240,
        "fireInterval": 2.6,
        "fireOffset": 0.8,
        "themeColor": "#00ff88"
      }
    ]
  },
  "./rooms/room_3_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_3_0",
    "coords": [
      3,
      0
    ],
    "title": "Sector 3: Laser Grid",
    "subtitle": "Navigate alternating ceiling laser beams, mobile barriers, and crossfire turrets!",
    "themeColor": "#ffaa00",
    "accentColor": "#ff6600",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      80,
      680
    ],
    "grid": [
      "####################",
      "#    v             #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>                 #",
      "#                  #",
      "                    ",
      "         ^          ",
      "         #          ",
      "       ### ##       ",
      "    ## ### ## ##    ",
      "    ## ### ## ####  ",
      "####^^^^^^^^^^^^####",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_3_0_1",
        "type": "core",
        "pos": [
          200,
          580
        ]
      },
      {
        "id": "core_3_0_2",
        "type": "prism",
        "pos": [
          400,
          300
        ]
      },
      {
        "id": "core_3_0_3",
        "type": "core",
        "pos": [
          600,
          580
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_3_0_1",
        "startX": 240,
        "startY": 480,
        "endX": 520,
        "endY": 480,
        "width": 88,
        "height": 16,
        "speed": 110,
        "pauseTime": 0.4,
        "themeColor": "#ffaa00"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_3_0_1",
        "startX1": 340,
        "startY1": 180,
        "startX2": 340,
        "startY2": 320,
        "endX1": 460,
        "endY1": 180,
        "endX2": 460,
        "endY2": 320,
        "speed": 80,
        "pauseTime": 0.5,
        "activeDuration": 2,
        "inactiveDuration": 2,
        "warningDuration": 0.7,
        "themeColor": "#ff0055"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_3_0_1",
        "x": 300,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0,
        "themeColor": "#ff3366"
      },
      {
        "id": "turret_3_0_4",
        "x": 480,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#ff00aa"
      },
      {
        "id": "turret_3_0_2",
        "x": 760,
        "y": 200,
        "direction": "left",
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 3,
        "fireOffset": 0.8,
        "themeColor": "#ff3366"
      },
      {
        "id": "turret_3_0_3",
        "x": 760,
        "y": 60,
        "angle": 135,
        "mode": "projectile",
        "projectileSpeed": 240,
        "fireInterval": 3.4,
        "fireOffset": 1.5,
        "themeColor": "#ffaa00"
      }
    ]
  },
  "rooms/room_3_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_3_0",
    "coords": [
      3,
      0
    ],
    "title": "Sector 3: Laser Grid",
    "subtitle": "Navigate alternating ceiling laser beams, mobile barriers, and crossfire turrets!",
    "themeColor": "#ffaa00",
    "accentColor": "#ff6600",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      80,
      680
    ],
    "grid": [
      "####################",
      "#    v             #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>                 #",
      "#                  #",
      "                    ",
      "         ^          ",
      "         #          ",
      "       ### ##       ",
      "    ## ### ## ##    ",
      "    ## ### ## ####  ",
      "####^^^^^^^^^^^^####",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_3_0_1",
        "type": "core",
        "pos": [
          200,
          580
        ]
      },
      {
        "id": "core_3_0_2",
        "type": "prism",
        "pos": [
          400,
          300
        ]
      },
      {
        "id": "core_3_0_3",
        "type": "core",
        "pos": [
          600,
          580
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_3_0_1",
        "startX": 240,
        "startY": 480,
        "endX": 520,
        "endY": 480,
        "width": 88,
        "height": 16,
        "speed": 110,
        "pauseTime": 0.4,
        "themeColor": "#ffaa00"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_3_0_1",
        "startX1": 340,
        "startY1": 180,
        "startX2": 340,
        "startY2": 320,
        "endX1": 460,
        "endY1": 180,
        "endX2": 460,
        "endY2": 320,
        "speed": 80,
        "pauseTime": 0.5,
        "activeDuration": 2,
        "inactiveDuration": 2,
        "warningDuration": 0.7,
        "themeColor": "#ff0055"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_3_0_1",
        "x": 300,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0,
        "themeColor": "#ff3366"
      },
      {
        "id": "turret_3_0_4",
        "x": 480,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#ff00aa"
      },
      {
        "id": "turret_3_0_2",
        "x": 760,
        "y": 200,
        "direction": "left",
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 3,
        "fireOffset": 0.8,
        "themeColor": "#ff3366"
      },
      {
        "id": "turret_3_0_3",
        "x": 760,
        "y": 60,
        "angle": 135,
        "mode": "projectile",
        "projectileSpeed": 240,
        "fireInterval": 3.4,
        "fireOffset": 1.5,
        "themeColor": "#ffaa00"
      }
    ]
  },
  "room_3_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_3_0",
    "coords": [
      3,
      0
    ],
    "title": "Sector 3: Laser Grid",
    "subtitle": "Navigate alternating ceiling laser beams, mobile barriers, and crossfire turrets!",
    "themeColor": "#ffaa00",
    "accentColor": "#ff6600",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      80,
      680
    ],
    "grid": [
      "####################",
      "#    v             #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>                 #",
      "#                  #",
      "                    ",
      "         ^          ",
      "         #          ",
      "       ### ##       ",
      "    ## ### ## ##    ",
      "    ## ### ## ####  ",
      "####^^^^^^^^^^^^####",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_3_0_1",
        "type": "core",
        "pos": [
          200,
          580
        ]
      },
      {
        "id": "core_3_0_2",
        "type": "prism",
        "pos": [
          400,
          300
        ]
      },
      {
        "id": "core_3_0_3",
        "type": "core",
        "pos": [
          600,
          580
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_3_0_1",
        "startX": 240,
        "startY": 480,
        "endX": 520,
        "endY": 480,
        "width": 88,
        "height": 16,
        "speed": 110,
        "pauseTime": 0.4,
        "themeColor": "#ffaa00"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_3_0_1",
        "startX1": 340,
        "startY1": 180,
        "startX2": 340,
        "startY2": 320,
        "endX1": 460,
        "endY1": 180,
        "endX2": 460,
        "endY2": 320,
        "speed": 80,
        "pauseTime": 0.5,
        "activeDuration": 2,
        "inactiveDuration": 2,
        "warningDuration": 0.7,
        "themeColor": "#ff0055"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_3_0_1",
        "x": 300,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0,
        "themeColor": "#ff3366"
      },
      {
        "id": "turret_3_0_4",
        "x": 480,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#ff00aa"
      },
      {
        "id": "turret_3_0_2",
        "x": 760,
        "y": 200,
        "direction": "left",
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 3,
        "fireOffset": 0.8,
        "themeColor": "#ff3366"
      },
      {
        "id": "turret_3_0_3",
        "x": 760,
        "y": 60,
        "angle": 135,
        "mode": "projectile",
        "projectileSpeed": 240,
        "fireInterval": 3.4,
        "fireOffset": 1.5,
        "themeColor": "#ffaa00"
      }
    ]
  },
  "room_3_0": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_3_0",
    "coords": [
      3,
      0
    ],
    "title": "Sector 3: Laser Grid",
    "subtitle": "Navigate alternating ceiling laser beams, mobile barriers, and crossfire turrets!",
    "themeColor": "#ffaa00",
    "accentColor": "#ff6600",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      80,
      680
    ],
    "grid": [
      "####################",
      "#    v             #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>                 #",
      "#                  #",
      "                    ",
      "         ^          ",
      "         #          ",
      "       ### ##       ",
      "    ## ### ## ##    ",
      "    ## ### ## ####  ",
      "####^^^^^^^^^^^^####",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_3_0_1",
        "type": "core",
        "pos": [
          200,
          580
        ]
      },
      {
        "id": "core_3_0_2",
        "type": "prism",
        "pos": [
          400,
          300
        ]
      },
      {
        "id": "core_3_0_3",
        "type": "core",
        "pos": [
          600,
          580
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_3_0_1",
        "startX": 240,
        "startY": 480,
        "endX": 520,
        "endY": 480,
        "width": 88,
        "height": 16,
        "speed": 110,
        "pauseTime": 0.4,
        "themeColor": "#ffaa00"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_3_0_1",
        "startX1": 340,
        "startY1": 180,
        "startX2": 340,
        "startY2": 320,
        "endX1": 460,
        "endY1": 180,
        "endX2": 460,
        "endY2": 320,
        "speed": 80,
        "pauseTime": 0.5,
        "activeDuration": 2,
        "inactiveDuration": 2,
        "warningDuration": 0.7,
        "themeColor": "#ff0055"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_3_0_1",
        "x": 300,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0,
        "themeColor": "#ff3366"
      },
      {
        "id": "turret_3_0_4",
        "x": 480,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 1.8,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#ff00aa"
      },
      {
        "id": "turret_3_0_2",
        "x": 760,
        "y": 200,
        "direction": "left",
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 3,
        "fireOffset": 0.8,
        "themeColor": "#ff3366"
      },
      {
        "id": "turret_3_0_3",
        "x": 760,
        "y": 60,
        "angle": 135,
        "mode": "projectile",
        "projectileSpeed": 240,
        "fireInterval": 3.4,
        "fireOffset": 1.5,
        "themeColor": "#ffaa00"
      }
    ]
  },
  "./rooms/room_4_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_4_0",
    "coords": [
      4,
      0
    ],
    "title": "Sector 4: Gravity Well",
    "subtitle": "Drop DOWN into the Crypt (4,-1) or ride across the void under diagonal laser sweeps",
    "themeColor": "#aa00ff",
    "accentColor": "#7700cc",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#     vvvv         #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "                    ",
      "                    ",
      "                    ",
      "           CCC      ",
      "       CCC          ",
      "     #        #     ",
      "######        ######",
      "#####>#      #<#####"
    ],
    "collectibles": [
      {
        "id": "core_4_0_1",
        "type": "core",
        "pos": [
          320,
          440
        ]
      },
      {
        "id": "core_4_0_2",
        "type": "core",
        "pos": [
          480,
          400
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_4_0_1",
        "startX": 240,
        "startY": 520,
        "endX": 520,
        "endY": 520,
        "width": 80,
        "height": 16,
        "speed": 130,
        "pauseTime": 0.5,
        "themeColor": "#aa00ff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_4_0_1",
        "x": 100,
        "y": 40,
        "angle": 40,
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.7,
        "themeColor": "#aa00ff"
      }
    ]
  },
  "rooms/room_4_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_4_0",
    "coords": [
      4,
      0
    ],
    "title": "Sector 4: Gravity Well",
    "subtitle": "Drop DOWN into the Crypt (4,-1) or ride across the void under diagonal laser sweeps",
    "themeColor": "#aa00ff",
    "accentColor": "#7700cc",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#     vvvv         #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "                    ",
      "                    ",
      "                    ",
      "           CCC      ",
      "       CCC          ",
      "     #        #     ",
      "######        ######",
      "#####>#      #<#####"
    ],
    "collectibles": [
      {
        "id": "core_4_0_1",
        "type": "core",
        "pos": [
          320,
          440
        ]
      },
      {
        "id": "core_4_0_2",
        "type": "core",
        "pos": [
          480,
          400
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_4_0_1",
        "startX": 240,
        "startY": 520,
        "endX": 520,
        "endY": 520,
        "width": 80,
        "height": 16,
        "speed": 130,
        "pauseTime": 0.5,
        "themeColor": "#aa00ff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_4_0_1",
        "x": 100,
        "y": 40,
        "angle": 40,
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.7,
        "themeColor": "#aa00ff"
      }
    ]
  },
  "room_4_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_4_0",
    "coords": [
      4,
      0
    ],
    "title": "Sector 4: Gravity Well",
    "subtitle": "Drop DOWN into the Crypt (4,-1) or ride across the void under diagonal laser sweeps",
    "themeColor": "#aa00ff",
    "accentColor": "#7700cc",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#     vvvv         #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "                    ",
      "                    ",
      "                    ",
      "           CCC      ",
      "       CCC          ",
      "     #        #     ",
      "######        ######",
      "#####>#      #<#####"
    ],
    "collectibles": [
      {
        "id": "core_4_0_1",
        "type": "core",
        "pos": [
          320,
          440
        ]
      },
      {
        "id": "core_4_0_2",
        "type": "core",
        "pos": [
          480,
          400
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_4_0_1",
        "startX": 240,
        "startY": 520,
        "endX": 520,
        "endY": 520,
        "width": 80,
        "height": 16,
        "speed": 130,
        "pauseTime": 0.5,
        "themeColor": "#aa00ff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_4_0_1",
        "x": 100,
        "y": 40,
        "angle": 40,
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.7,
        "themeColor": "#aa00ff"
      }
    ]
  },
  "room_4_0": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_4_0",
    "coords": [
      4,
      0
    ],
    "title": "Sector 4: Gravity Well",
    "subtitle": "Drop DOWN into the Crypt (4,-1) or ride across the void under diagonal laser sweeps",
    "themeColor": "#aa00ff",
    "accentColor": "#7700cc",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#     vvvv         #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "                    ",
      "                    ",
      "                    ",
      "           CCC      ",
      "       CCC          ",
      "     #        #     ",
      "######        ######",
      "#####>#      #<#####"
    ],
    "collectibles": [
      {
        "id": "core_4_0_1",
        "type": "core",
        "pos": [
          320,
          440
        ]
      },
      {
        "id": "core_4_0_2",
        "type": "core",
        "pos": [
          480,
          400
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_4_0_1",
        "startX": 240,
        "startY": 520,
        "endX": 520,
        "endY": 520,
        "width": 80,
        "height": 16,
        "speed": 130,
        "pauseTime": 0.5,
        "themeColor": "#aa00ff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_4_0_1",
        "x": 100,
        "y": 40,
        "angle": 40,
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.7,
        "themeColor": "#aa00ff"
      }
    ]
  },
  "./rooms/room_5_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_5_0",
    "coords": [
      5,
      0
    ],
    "title": "Sector 5: Beyond Euclidean Space",
    "subtitle": "Ride the dimensional shuttle through the quantum barrier crossfire",
    "themeColor": "#00e5ff",
    "accentColor": "#0099ff",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "        ====        ",
      "                    ",
      "    ====    ====    ",
      "                    ",
      "  ====        ====  ",
      "                    ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_5_0_1",
        "type": "prism",
        "pos": [
          220,
          460
        ]
      },
      {
        "id": "core_5_0_2",
        "type": "prism",
        "pos": [
          400,
          340
        ]
      },
      {
        "id": "core_5_0_3",
        "type": "core",
        "pos": [
          580,
          460
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_5_0_1",
        "startX": 220,
        "startY": 400,
        "endX": 580,
        "endY": 400,
        "width": 80,
        "height": 16,
        "speed": 150,
        "pauseTime": 0.4,
        "themeColor": "#00e5ff"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_5_0_1",
        "startX1": 390,
        "startY1": 160,
        "startX2": 410,
        "startY2": 300,
        "activeDuration": 2,
        "inactiveDuration": 2.5,
        "warningDuration": 0.8,
        "themeColor": "#00e5ff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_5_0_1",
        "x": 760,
        "y": 240,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#00e5ff"
      }
    ]
  },
  "rooms/room_5_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_5_0",
    "coords": [
      5,
      0
    ],
    "title": "Sector 5: Beyond Euclidean Space",
    "subtitle": "Ride the dimensional shuttle through the quantum barrier crossfire",
    "themeColor": "#00e5ff",
    "accentColor": "#0099ff",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "        ====        ",
      "                    ",
      "    ====    ====    ",
      "                    ",
      "  ====        ====  ",
      "                    ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_5_0_1",
        "type": "prism",
        "pos": [
          220,
          460
        ]
      },
      {
        "id": "core_5_0_2",
        "type": "prism",
        "pos": [
          400,
          340
        ]
      },
      {
        "id": "core_5_0_3",
        "type": "core",
        "pos": [
          580,
          460
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_5_0_1",
        "startX": 220,
        "startY": 400,
        "endX": 580,
        "endY": 400,
        "width": 80,
        "height": 16,
        "speed": 150,
        "pauseTime": 0.4,
        "themeColor": "#00e5ff"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_5_0_1",
        "startX1": 390,
        "startY1": 160,
        "startX2": 410,
        "startY2": 300,
        "activeDuration": 2,
        "inactiveDuration": 2.5,
        "warningDuration": 0.8,
        "themeColor": "#00e5ff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_5_0_1",
        "x": 760,
        "y": 240,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#00e5ff"
      }
    ]
  },
  "room_5_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_5_0",
    "coords": [
      5,
      0
    ],
    "title": "Sector 5: Beyond Euclidean Space",
    "subtitle": "Ride the dimensional shuttle through the quantum barrier crossfire",
    "themeColor": "#00e5ff",
    "accentColor": "#0099ff",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "        ====        ",
      "                    ",
      "    ====    ====    ",
      "                    ",
      "  ====        ====  ",
      "                    ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_5_0_1",
        "type": "prism",
        "pos": [
          220,
          460
        ]
      },
      {
        "id": "core_5_0_2",
        "type": "prism",
        "pos": [
          400,
          340
        ]
      },
      {
        "id": "core_5_0_3",
        "type": "core",
        "pos": [
          580,
          460
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_5_0_1",
        "startX": 220,
        "startY": 400,
        "endX": 580,
        "endY": 400,
        "width": 80,
        "height": 16,
        "speed": 150,
        "pauseTime": 0.4,
        "themeColor": "#00e5ff"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_5_0_1",
        "startX1": 390,
        "startY1": 160,
        "startX2": 410,
        "startY2": 300,
        "activeDuration": 2,
        "inactiveDuration": 2.5,
        "warningDuration": 0.8,
        "themeColor": "#00e5ff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_5_0_1",
        "x": 760,
        "y": 240,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#00e5ff"
      }
    ]
  },
  "room_5_0": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_5_0",
    "coords": [
      5,
      0
    ],
    "title": "Sector 5: Beyond Euclidean Space",
    "subtitle": "Ride the dimensional shuttle through the quantum barrier crossfire",
    "themeColor": "#00e5ff",
    "accentColor": "#0099ff",
    "exits": {
      "left": true,
      "right": true,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "        ====        ",
      "                    ",
      "    ====    ====    ",
      "                    ",
      "  ====        ====  ",
      "                    ",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_5_0_1",
        "type": "prism",
        "pos": [
          220,
          460
        ]
      },
      {
        "id": "core_5_0_2",
        "type": "prism",
        "pos": [
          400,
          340
        ]
      },
      {
        "id": "core_5_0_3",
        "type": "core",
        "pos": [
          580,
          460
        ]
      }
    ],
    "movingPlatforms": [
      {
        "id": "plat_5_0_1",
        "startX": 220,
        "startY": 400,
        "endX": 580,
        "endY": 400,
        "width": 80,
        "height": 16,
        "speed": 150,
        "pauseTime": 0.4,
        "themeColor": "#00e5ff"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_5_0_1",
        "startX1": 390,
        "startY1": 160,
        "startX2": 410,
        "startY2": 300,
        "activeDuration": 2,
        "inactiveDuration": 2.5,
        "warningDuration": 0.8,
        "themeColor": "#00e5ff"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_5_0_1",
        "x": 760,
        "y": 240,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.2,
        "warningDuration": 0.6,
        "initialPhase": 0.5,
        "themeColor": "#00e5ff"
      }
    ]
  },
  "./rooms/room_6_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_6_0",
    "coords": [
      6,
      0
    ],
    "title": "Sector 6: Prism Horizon",
    "subtitle": "Final Sector! Breach the Warp Core defense lasers to complete the quantum voyage!",
    "themeColor": "#ff0055",
    "accentColor": "#ffcc00",
    "exits": {
      "left": true,
      "right": false,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "                   #",
      "         ===       #",
      "                   #",
      "     ====      G   #",
      "              ###  #",
      "             ##### #",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_6_0_1",
        "type": "prism",
        "pos": [
          260,
          460
        ]
      },
      {
        "id": "core_6_0_2",
        "type": "prism",
        "pos": [
          420,
          380
        ]
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_6_0_1",
        "x": 600,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.2,
        "warningDuration": 0.7,
        "initialPhase": 0.2,
        "themeColor": "#ff0055"
      },
      {
        "id": "turret_6_0_2",
        "x": 40,
        "y": 400,
        "angle": -20,
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 2.4,
        "fireOffset": 0.6,
        "themeColor": "#ffcc00"
      }
    ]
  },
  "rooms/room_6_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_6_0",
    "coords": [
      6,
      0
    ],
    "title": "Sector 6: Prism Horizon",
    "subtitle": "Final Sector! Breach the Warp Core defense lasers to complete the quantum voyage!",
    "themeColor": "#ff0055",
    "accentColor": "#ffcc00",
    "exits": {
      "left": true,
      "right": false,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "                   #",
      "         ===       #",
      "                   #",
      "     ====      G   #",
      "              ###  #",
      "             ##### #",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_6_0_1",
        "type": "prism",
        "pos": [
          260,
          460
        ]
      },
      {
        "id": "core_6_0_2",
        "type": "prism",
        "pos": [
          420,
          380
        ]
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_6_0_1",
        "x": 600,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.2,
        "warningDuration": 0.7,
        "initialPhase": 0.2,
        "themeColor": "#ff0055"
      },
      {
        "id": "turret_6_0_2",
        "x": 40,
        "y": 400,
        "angle": -20,
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 2.4,
        "fireOffset": 0.6,
        "themeColor": "#ffcc00"
      }
    ]
  },
  "room_6_0.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_6_0",
    "coords": [
      6,
      0
    ],
    "title": "Sector 6: Prism Horizon",
    "subtitle": "Final Sector! Breach the Warp Core defense lasers to complete the quantum voyage!",
    "themeColor": "#ff0055",
    "accentColor": "#ffcc00",
    "exits": {
      "left": true,
      "right": false,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "                   #",
      "         ===       #",
      "                   #",
      "     ====      G   #",
      "              ###  #",
      "             ##### #",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_6_0_1",
        "type": "prism",
        "pos": [
          260,
          460
        ]
      },
      {
        "id": "core_6_0_2",
        "type": "prism",
        "pos": [
          420,
          380
        ]
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_6_0_1",
        "x": 600,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.2,
        "warningDuration": 0.7,
        "initialPhase": 0.2,
        "themeColor": "#ff0055"
      },
      {
        "id": "turret_6_0_2",
        "x": 40,
        "y": 400,
        "angle": -20,
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 2.4,
        "fireOffset": 0.6,
        "themeColor": "#ffcc00"
      }
    ]
  },
  "room_6_0": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_6_0",
    "coords": [
      6,
      0
    ],
    "title": "Sector 6: Prism Horizon",
    "subtitle": "Final Sector! Breach the Warp Core defense lasers to complete the quantum voyage!",
    "themeColor": "#ff0055",
    "accentColor": "#ffcc00",
    "exits": {
      "left": true,
      "right": false,
      "up": false,
      "down": false
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "                   #",
      "         ===       #",
      "                   #",
      "     ====      G   #",
      "              ###  #",
      "             ##### #",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_6_0_1",
        "type": "prism",
        "pos": [
          260,
          460
        ]
      },
      {
        "id": "core_6_0_2",
        "type": "prism",
        "pos": [
          420,
          380
        ]
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_6_0_1",
        "x": 600,
        "y": 40,
        "direction": "down",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.2,
        "warningDuration": 0.7,
        "initialPhase": 0.2,
        "themeColor": "#ff0055"
      },
      {
        "id": "turret_6_0_2",
        "x": 40,
        "y": 400,
        "angle": -20,
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 2.4,
        "fireOffset": 0.6,
        "themeColor": "#ffcc00"
      }
    ]
  },
  "./rooms/room_2_1.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_1",
    "coords": [
      2,
      1
    ],
    "title": "Sector (2,1): The Spire",
    "subtitle": "Ascend the spire — time the elevator past laser beams and barriers to reach the Zenith!",
    "themeColor": "#39ff14",
    "accentColor": "#00aa33",
    "exits": {
      "left": false,
      "right": false,
      "up": true,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "#######      #######",
      "# vvvv        vvvv #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#>                <#",
      "#                  #",
      "#      ==BB==      #",
      "#                  #",
      "#                  #",
      "#   ====    ====   #",
      "#                  #",
      "#      ======      #",
      "#                  #",
      "# ^  ===    ===  ^ #",
      "# #              # #",
      "#                  #",
      "#B                B#",
      "#######      #######",
      "#######      #######"
    ],
    "collectibles": [
      {
        "id": "core_2_1_1",
        "type": "core",
        "pos": [
          160,
          540
        ]
      },
      {
        "id": "core_2_1_2",
        "type": "core",
        "pos": [
          640,
          540
        ]
      },
      {
        "id": "core_2_1_3",
        "type": "prism",
        "pos": [
          400,
          200
        ]
      }
    ],
    "bounceProps": {
      "17,1": {
        "vy": -900
      },
      "17,18": {
        "vy": -900
      },
      "7,9": {
        "vy": -1200
      },
      "7,10": {
        "vy": -1200
      }
    },
    "movingPlatforms": [
      {
        "id": "plat_2_1_1",
        "startX": 360,
        "startY": 480,
        "endX": 360,
        "endY": 280,
        "width": 80,
        "height": 16,
        "speed": 90,
        "pauseTime": 0.5,
        "themeColor": "#39ff14"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_2_1_1",
        "startX1": 280,
        "startY1": 220,
        "startX2": 520,
        "startY2": 220,
        "activeDuration": 1.8,
        "inactiveDuration": 2.5,
        "warningDuration": 0.7,
        "themeColor": "#ff0055"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_1_1",
        "x": 40,
        "y": 380,
        "direction": "right",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.5,
        "warningDuration": 0.6,
        "initialPhase": 0.7,
        "themeColor": "#39ff14"
      }
    ]
  },
  "rooms/room_2_1.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_1",
    "coords": [
      2,
      1
    ],
    "title": "Sector (2,1): The Spire",
    "subtitle": "Ascend the spire — time the elevator past laser beams and barriers to reach the Zenith!",
    "themeColor": "#39ff14",
    "accentColor": "#00aa33",
    "exits": {
      "left": false,
      "right": false,
      "up": true,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "#######      #######",
      "# vvvv        vvvv #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#>                <#",
      "#                  #",
      "#      ==BB==      #",
      "#                  #",
      "#                  #",
      "#   ====    ====   #",
      "#                  #",
      "#      ======      #",
      "#                  #",
      "# ^  ===    ===  ^ #",
      "# #              # #",
      "#                  #",
      "#B                B#",
      "#######      #######",
      "#######      #######"
    ],
    "collectibles": [
      {
        "id": "core_2_1_1",
        "type": "core",
        "pos": [
          160,
          540
        ]
      },
      {
        "id": "core_2_1_2",
        "type": "core",
        "pos": [
          640,
          540
        ]
      },
      {
        "id": "core_2_1_3",
        "type": "prism",
        "pos": [
          400,
          200
        ]
      }
    ],
    "bounceProps": {
      "17,1": {
        "vy": -900
      },
      "17,18": {
        "vy": -900
      },
      "7,9": {
        "vy": -1200
      },
      "7,10": {
        "vy": -1200
      }
    },
    "movingPlatforms": [
      {
        "id": "plat_2_1_1",
        "startX": 360,
        "startY": 480,
        "endX": 360,
        "endY": 280,
        "width": 80,
        "height": 16,
        "speed": 90,
        "pauseTime": 0.5,
        "themeColor": "#39ff14"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_2_1_1",
        "startX1": 280,
        "startY1": 220,
        "startX2": 520,
        "startY2": 220,
        "activeDuration": 1.8,
        "inactiveDuration": 2.5,
        "warningDuration": 0.7,
        "themeColor": "#ff0055"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_1_1",
        "x": 40,
        "y": 380,
        "direction": "right",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.5,
        "warningDuration": 0.6,
        "initialPhase": 0.7,
        "themeColor": "#39ff14"
      }
    ]
  },
  "room_2_1.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_1",
    "coords": [
      2,
      1
    ],
    "title": "Sector (2,1): The Spire",
    "subtitle": "Ascend the spire — time the elevator past laser beams and barriers to reach the Zenith!",
    "themeColor": "#39ff14",
    "accentColor": "#00aa33",
    "exits": {
      "left": false,
      "right": false,
      "up": true,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "#######      #######",
      "# vvvv        vvvv #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#>                <#",
      "#                  #",
      "#      ==BB==      #",
      "#                  #",
      "#                  #",
      "#   ====    ====   #",
      "#                  #",
      "#      ======      #",
      "#                  #",
      "# ^  ===    ===  ^ #",
      "# #              # #",
      "#                  #",
      "#B                B#",
      "#######      #######",
      "#######      #######"
    ],
    "collectibles": [
      {
        "id": "core_2_1_1",
        "type": "core",
        "pos": [
          160,
          540
        ]
      },
      {
        "id": "core_2_1_2",
        "type": "core",
        "pos": [
          640,
          540
        ]
      },
      {
        "id": "core_2_1_3",
        "type": "prism",
        "pos": [
          400,
          200
        ]
      }
    ],
    "bounceProps": {
      "17,1": {
        "vy": -900
      },
      "17,18": {
        "vy": -900
      },
      "7,9": {
        "vy": -1200
      },
      "7,10": {
        "vy": -1200
      }
    },
    "movingPlatforms": [
      {
        "id": "plat_2_1_1",
        "startX": 360,
        "startY": 480,
        "endX": 360,
        "endY": 280,
        "width": 80,
        "height": 16,
        "speed": 90,
        "pauseTime": 0.5,
        "themeColor": "#39ff14"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_2_1_1",
        "startX1": 280,
        "startY1": 220,
        "startX2": 520,
        "startY2": 220,
        "activeDuration": 1.8,
        "inactiveDuration": 2.5,
        "warningDuration": 0.7,
        "themeColor": "#ff0055"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_1_1",
        "x": 40,
        "y": 380,
        "direction": "right",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.5,
        "warningDuration": 0.6,
        "initialPhase": 0.7,
        "themeColor": "#39ff14"
      }
    ]
  },
  "room_2_1": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_1",
    "coords": [
      2,
      1
    ],
    "title": "Sector (2,1): The Spire",
    "subtitle": "Ascend the spire — time the elevator past laser beams and barriers to reach the Zenith!",
    "themeColor": "#39ff14",
    "accentColor": "#00aa33",
    "exits": {
      "left": false,
      "right": false,
      "up": true,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "#######      #######",
      "# vvvv        vvvv #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#>                <#",
      "#                  #",
      "#      ==BB==      #",
      "#                  #",
      "#                  #",
      "#   ====    ====   #",
      "#                  #",
      "#      ======      #",
      "#                  #",
      "# ^  ===    ===  ^ #",
      "# #              # #",
      "#                  #",
      "#B                B#",
      "#######      #######",
      "#######      #######"
    ],
    "collectibles": [
      {
        "id": "core_2_1_1",
        "type": "core",
        "pos": [
          160,
          540
        ]
      },
      {
        "id": "core_2_1_2",
        "type": "core",
        "pos": [
          640,
          540
        ]
      },
      {
        "id": "core_2_1_3",
        "type": "prism",
        "pos": [
          400,
          200
        ]
      }
    ],
    "bounceProps": {
      "17,1": {
        "vy": -900
      },
      "17,18": {
        "vy": -900
      },
      "7,9": {
        "vy": -1200
      },
      "7,10": {
        "vy": -1200
      }
    },
    "movingPlatforms": [
      {
        "id": "plat_2_1_1",
        "startX": 360,
        "startY": 480,
        "endX": 360,
        "endY": 280,
        "width": 80,
        "height": 16,
        "speed": 90,
        "pauseTime": 0.5,
        "themeColor": "#39ff14"
      }
    ],
    "laserBarriers": [
      {
        "id": "barrier_2_1_1",
        "startX1": 280,
        "startY1": 220,
        "startX2": 520,
        "startY2": 220,
        "activeDuration": 1.8,
        "inactiveDuration": 2.5,
        "warningDuration": 0.7,
        "themeColor": "#ff0055"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_1_1",
        "x": 40,
        "y": 380,
        "direction": "right",
        "mode": "beam",
        "activeDuration": 2,
        "inactiveDuration": 2.5,
        "warningDuration": 0.6,
        "initialPhase": 0.7,
        "themeColor": "#39ff14"
      }
    ]
  },
  "./rooms/room_2_2.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_2",
    "coords": [
      2,
      2
    ],
    "title": "Sector (2,2): Starlight Zenith",
    "subtitle": "Ride the solar cruiser across intersecting solar beams and diagonal plasma fire",
    "themeColor": "#ffe600",
    "accentColor": "#ff8800",
    "exits": {
      "left": false,
      "right": false,
      "up": false,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ####       #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#  #####    #####  #",
      "#                  #",
      "#   ###      ###   #",
      "#      ======      #",
      "# B              B #",
      "#######      #######",
      "#######      #######"
    ],
    "collectibles": [
      {
        "id": "core_2_2_1",
        "type": "prism",
        "pos": [
          200,
          380
        ]
      },
      {
        "id": "core_2_2_2",
        "type": "prism",
        "pos": [
          600,
          380
        ]
      },
      {
        "id": "core_2_2_3",
        "type": "prism",
        "pos": [
          400,
          220
        ]
      }
    ],
    "bounceProps": {
      "17,2": {
        "vy": -1400
      },
      "17,17": {
        "vy": -1400
      }
    },
    "movingPlatforms": [
      {
        "id": "plat_2_2_1",
        "startX": 220,
        "startY": 460,
        "endX": 580,
        "endY": 460,
        "width": 80,
        "height": 16,
        "speed": 130,
        "pauseTime": 0.5,
        "themeColor": "#ffe600"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_2_1",
        "x": 40,
        "y": 60,
        "angle": 45,
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 2.8,
        "fireOffset": 0.6,
        "themeColor": "#ffe600"
      },
      {
        "id": "turret_2_2_2",
        "x": 760,
        "y": 60,
        "angle": 135,
        "mode": "beam",
        "activeDuration": 2.4,
        "inactiveDuration": 2.2,
        "warningDuration": 0.7,
        "initialPhase": 0.3,
        "themeColor": "#ff8800"
      }
    ]
  },
  "rooms/room_2_2.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_2",
    "coords": [
      2,
      2
    ],
    "title": "Sector (2,2): Starlight Zenith",
    "subtitle": "Ride the solar cruiser across intersecting solar beams and diagonal plasma fire",
    "themeColor": "#ffe600",
    "accentColor": "#ff8800",
    "exits": {
      "left": false,
      "right": false,
      "up": false,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ####       #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#  #####    #####  #",
      "#                  #",
      "#   ###      ###   #",
      "#      ======      #",
      "# B              B #",
      "#######      #######",
      "#######      #######"
    ],
    "collectibles": [
      {
        "id": "core_2_2_1",
        "type": "prism",
        "pos": [
          200,
          380
        ]
      },
      {
        "id": "core_2_2_2",
        "type": "prism",
        "pos": [
          600,
          380
        ]
      },
      {
        "id": "core_2_2_3",
        "type": "prism",
        "pos": [
          400,
          220
        ]
      }
    ],
    "bounceProps": {
      "17,2": {
        "vy": -1400
      },
      "17,17": {
        "vy": -1400
      }
    },
    "movingPlatforms": [
      {
        "id": "plat_2_2_1",
        "startX": 220,
        "startY": 460,
        "endX": 580,
        "endY": 460,
        "width": 80,
        "height": 16,
        "speed": 130,
        "pauseTime": 0.5,
        "themeColor": "#ffe600"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_2_1",
        "x": 40,
        "y": 60,
        "angle": 45,
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 2.8,
        "fireOffset": 0.6,
        "themeColor": "#ffe600"
      },
      {
        "id": "turret_2_2_2",
        "x": 760,
        "y": 60,
        "angle": 135,
        "mode": "beam",
        "activeDuration": 2.4,
        "inactiveDuration": 2.2,
        "warningDuration": 0.7,
        "initialPhase": 0.3,
        "themeColor": "#ff8800"
      }
    ]
  },
  "room_2_2.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_2",
    "coords": [
      2,
      2
    ],
    "title": "Sector (2,2): Starlight Zenith",
    "subtitle": "Ride the solar cruiser across intersecting solar beams and diagonal plasma fire",
    "themeColor": "#ffe600",
    "accentColor": "#ff8800",
    "exits": {
      "left": false,
      "right": false,
      "up": false,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ####       #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#  #####    #####  #",
      "#                  #",
      "#   ###      ###   #",
      "#      ======      #",
      "# B              B #",
      "#######      #######",
      "#######      #######"
    ],
    "collectibles": [
      {
        "id": "core_2_2_1",
        "type": "prism",
        "pos": [
          200,
          380
        ]
      },
      {
        "id": "core_2_2_2",
        "type": "prism",
        "pos": [
          600,
          380
        ]
      },
      {
        "id": "core_2_2_3",
        "type": "prism",
        "pos": [
          400,
          220
        ]
      }
    ],
    "bounceProps": {
      "17,2": {
        "vy": -1400
      },
      "17,17": {
        "vy": -1400
      }
    },
    "movingPlatforms": [
      {
        "id": "plat_2_2_1",
        "startX": 220,
        "startY": 460,
        "endX": 580,
        "endY": 460,
        "width": 80,
        "height": 16,
        "speed": 130,
        "pauseTime": 0.5,
        "themeColor": "#ffe600"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_2_1",
        "x": 40,
        "y": 60,
        "angle": 45,
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 2.8,
        "fireOffset": 0.6,
        "themeColor": "#ffe600"
      },
      {
        "id": "turret_2_2_2",
        "x": 760,
        "y": 60,
        "angle": 135,
        "mode": "beam",
        "activeDuration": 2.4,
        "inactiveDuration": 2.2,
        "warningDuration": 0.7,
        "initialPhase": 0.3,
        "themeColor": "#ff8800"
      }
    ]
  },
  "room_2_2": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_2_2",
    "coords": [
      2,
      2
    ],
    "title": "Sector (2,2): Starlight Zenith",
    "subtitle": "Ride the solar cruiser across intersecting solar beams and diagonal plasma fire",
    "themeColor": "#ffe600",
    "accentColor": "#ff8800",
    "exits": {
      "left": false,
      "right": false,
      "up": false,
      "down": true
    },
    "spawnPoint": [
      120,
      680
    ],
    "grid": [
      "####################",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ####       #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#  #####    #####  #",
      "#                  #",
      "#   ###      ###   #",
      "#      ======      #",
      "# B              B #",
      "#######      #######",
      "#######      #######"
    ],
    "collectibles": [
      {
        "id": "core_2_2_1",
        "type": "prism",
        "pos": [
          200,
          380
        ]
      },
      {
        "id": "core_2_2_2",
        "type": "prism",
        "pos": [
          600,
          380
        ]
      },
      {
        "id": "core_2_2_3",
        "type": "prism",
        "pos": [
          400,
          220
        ]
      }
    ],
    "bounceProps": {
      "17,2": {
        "vy": -1400
      },
      "17,17": {
        "vy": -1400
      }
    },
    "movingPlatforms": [
      {
        "id": "plat_2_2_1",
        "startX": 220,
        "startY": 460,
        "endX": 580,
        "endY": 460,
        "width": 80,
        "height": 16,
        "speed": 130,
        "pauseTime": 0.5,
        "themeColor": "#ffe600"
      }
    ],
    "laserTurrets": [
      {
        "id": "turret_2_2_1",
        "x": 40,
        "y": 60,
        "angle": 45,
        "mode": "projectile",
        "projectileSpeed": 260,
        "fireInterval": 2.8,
        "fireOffset": 0.6,
        "themeColor": "#ffe600"
      },
      {
        "id": "turret_2_2_2",
        "x": 760,
        "y": 60,
        "angle": 135,
        "mode": "beam",
        "activeDuration": 2.4,
        "inactiveDuration": 2.2,
        "warningDuration": 0.7,
        "initialPhase": 0.3,
        "themeColor": "#ff8800"
      }
    ]
  },
  "./rooms/room_4_-1.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_4_-1",
    "coords": [
      4,
      -1
    ],
    "title": "Sector (4,-1): Sub-Zero Crypt",
    "subtitle": "Secret deep vault! Time the Super Bounce launch through the cryogenic laser defense",
    "themeColor": "#0033ff",
    "accentColor": "#00ffff",
    "exits": {
      "left": false,
      "right": false,
      "up": true,
      "down": false
    },
    "spawnPoint": [
      400,
      520
    ],
    "grid": [
      "#######      #######",
      "# vvvv        vvvv #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>  ===      ===  <#",
      "#>                <#",
      "#BB^^^^BBBBBB^^^^BB#",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_4_m1_1",
        "type": "prism",
        "pos": [
          400,
          420
        ]
      },
      {
        "id": "core_4_m1_2",
        "type": "prism",
        "pos": [
          380,
          200
        ]
      }
    ],
    "bounceProps": {
      "17,7": {
        "vy": -1550
      },
      "17,8": {
        "vy": -1550
      },
      "17,9": {
        "vy": -1550
      },
      "17,10": {
        "vy": -1550
      },
      "17,11": {
        "vy": -1550
      },
      "17,12": {
        "vy": -1550
      },
      "17,1": {
        "vy": -1100,
        "vx": 200
      },
      "17,2": {
        "vy": -1100,
        "vx": 200
      },
      "17,17": {
        "vy": -1100,
        "vx": -200
      },
      "17,18": {
        "vy": -1100,
        "vx": -200
      }
    },
    "laserTurrets": [
      {
        "id": "turret_4_m1_1",
        "x": 40,
        "y": 280,
        "direction": "right",
        "mode": "projectile",
        "projectileSpeed": 280,
        "fireInterval": 2.6,
        "fireOffset": 0.5,
        "themeColor": "#00ffff"
      },
      {
        "id": "turret_4_m1_2",
        "x": 760,
        "y": 360,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.7,
        "initialPhase": 0.4,
        "themeColor": "#00ffff"
      }
    ]
  },
  "rooms/room_4_-1.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_4_-1",
    "coords": [
      4,
      -1
    ],
    "title": "Sector (4,-1): Sub-Zero Crypt",
    "subtitle": "Secret deep vault! Time the Super Bounce launch through the cryogenic laser defense",
    "themeColor": "#0033ff",
    "accentColor": "#00ffff",
    "exits": {
      "left": false,
      "right": false,
      "up": true,
      "down": false
    },
    "spawnPoint": [
      400,
      520
    ],
    "grid": [
      "#######      #######",
      "# vvvv        vvvv #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>  ===      ===  <#",
      "#>                <#",
      "#BB^^^^BBBBBB^^^^BB#",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_4_m1_1",
        "type": "prism",
        "pos": [
          400,
          420
        ]
      },
      {
        "id": "core_4_m1_2",
        "type": "prism",
        "pos": [
          380,
          200
        ]
      }
    ],
    "bounceProps": {
      "17,7": {
        "vy": -1550
      },
      "17,8": {
        "vy": -1550
      },
      "17,9": {
        "vy": -1550
      },
      "17,10": {
        "vy": -1550
      },
      "17,11": {
        "vy": -1550
      },
      "17,12": {
        "vy": -1550
      },
      "17,1": {
        "vy": -1100,
        "vx": 200
      },
      "17,2": {
        "vy": -1100,
        "vx": 200
      },
      "17,17": {
        "vy": -1100,
        "vx": -200
      },
      "17,18": {
        "vy": -1100,
        "vx": -200
      }
    },
    "laserTurrets": [
      {
        "id": "turret_4_m1_1",
        "x": 40,
        "y": 280,
        "direction": "right",
        "mode": "projectile",
        "projectileSpeed": 280,
        "fireInterval": 2.6,
        "fireOffset": 0.5,
        "themeColor": "#00ffff"
      },
      {
        "id": "turret_4_m1_2",
        "x": 760,
        "y": 360,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.7,
        "initialPhase": 0.4,
        "themeColor": "#00ffff"
      }
    ]
  },
  "room_4_-1.json": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_4_-1",
    "coords": [
      4,
      -1
    ],
    "title": "Sector (4,-1): Sub-Zero Crypt",
    "subtitle": "Secret deep vault! Time the Super Bounce launch through the cryogenic laser defense",
    "themeColor": "#0033ff",
    "accentColor": "#00ffff",
    "exits": {
      "left": false,
      "right": false,
      "up": true,
      "down": false
    },
    "spawnPoint": [
      400,
      520
    ],
    "grid": [
      "#######      #######",
      "# vvvv        vvvv #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>  ===      ===  <#",
      "#>                <#",
      "#BB^^^^BBBBBB^^^^BB#",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_4_m1_1",
        "type": "prism",
        "pos": [
          400,
          420
        ]
      },
      {
        "id": "core_4_m1_2",
        "type": "prism",
        "pos": [
          380,
          200
        ]
      }
    ],
    "bounceProps": {
      "17,7": {
        "vy": -1550
      },
      "17,8": {
        "vy": -1550
      },
      "17,9": {
        "vy": -1550
      },
      "17,10": {
        "vy": -1550
      },
      "17,11": {
        "vy": -1550
      },
      "17,12": {
        "vy": -1550
      },
      "17,1": {
        "vy": -1100,
        "vx": 200
      },
      "17,2": {
        "vy": -1100,
        "vx": 200
      },
      "17,17": {
        "vy": -1100,
        "vx": -200
      },
      "17,18": {
        "vy": -1100,
        "vx": -200
      }
    },
    "laserTurrets": [
      {
        "id": "turret_4_m1_1",
        "x": 40,
        "y": 280,
        "direction": "right",
        "mode": "projectile",
        "projectileSpeed": 280,
        "fireInterval": 2.6,
        "fireOffset": 0.5,
        "themeColor": "#00ffff"
      },
      {
        "id": "turret_4_m1_2",
        "x": 760,
        "y": 360,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.7,
        "initialPhase": 0.4,
        "themeColor": "#00ffff"
      }
    ]
  },
  "room_4_-1": {
    "$schema": "../../schemas/room.schema.json",
    "id": "room_4_-1",
    "coords": [
      4,
      -1
    ],
    "title": "Sector (4,-1): Sub-Zero Crypt",
    "subtitle": "Secret deep vault! Time the Super Bounce launch through the cryogenic laser defense",
    "themeColor": "#0033ff",
    "accentColor": "#00ffff",
    "exits": {
      "left": false,
      "right": false,
      "up": true,
      "down": false
    },
    "spawnPoint": [
      400,
      520
    ],
    "grid": [
      "#######      #######",
      "# vvvv        vvvv #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#                  #",
      "#       ====       #",
      "#>  ===      ===  <#",
      "#>                <#",
      "#BB^^^^BBBBBB^^^^BB#",
      "####################",
      "####################"
    ],
    "collectibles": [
      {
        "id": "core_4_m1_1",
        "type": "prism",
        "pos": [
          400,
          420
        ]
      },
      {
        "id": "core_4_m1_2",
        "type": "prism",
        "pos": [
          380,
          200
        ]
      }
    ],
    "bounceProps": {
      "17,7": {
        "vy": -1550
      },
      "17,8": {
        "vy": -1550
      },
      "17,9": {
        "vy": -1550
      },
      "17,10": {
        "vy": -1550
      },
      "17,11": {
        "vy": -1550
      },
      "17,12": {
        "vy": -1550
      },
      "17,1": {
        "vy": -1100,
        "vx": 200
      },
      "17,2": {
        "vy": -1100,
        "vx": 200
      },
      "17,17": {
        "vy": -1100,
        "vx": -200
      },
      "17,18": {
        "vy": -1100,
        "vx": -200
      }
    },
    "laserTurrets": [
      {
        "id": "turret_4_m1_1",
        "x": 40,
        "y": 280,
        "direction": "right",
        "mode": "projectile",
        "projectileSpeed": 280,
        "fireInterval": 2.6,
        "fireOffset": 0.5,
        "themeColor": "#00ffff"
      },
      {
        "id": "turret_4_m1_2",
        "x": 760,
        "y": 360,
        "direction": "left",
        "mode": "beam",
        "activeDuration": 2.2,
        "inactiveDuration": 2.4,
        "warningDuration": 0.7,
        "initialPhase": 0.4,
        "themeColor": "#00ffff"
      }
    ]
  }
};

export function getDemoWorld(): WorldData {
  const startingCoords: [number, number] = Array.isArray(DEMO_WORLD_MANIFEST.startingCoords)
    ? [DEMO_WORLD_MANIFEST.startingCoords[0], DEMO_WORLD_MANIFEST.startingCoords[1]]
    : [0, 0];

  const rooms: RoomData[] = DEMO_WORLD_MANIFEST.rooms.map((relPath: string, index: number) => {
    const raw = DEMO_ROOMS_MAP[relPath] || DEMO_ROOMS_MAP[relPath.replace(/^\.\//, '')];
    if (!raw) {
      throw new Error(`Missing demo room file: ${relPath}`);
    }

    const coords: [number, number] = Array.isArray(raw.coords)
      ? [raw.coords[0], raw.coords[1]]
      : [index, 0];

    const spawnPoint: [number, number] | undefined = raw.spawnPoint
      ? (Array.isArray(raw.spawnPoint)
          ? [raw.spawnPoint[0], raw.spawnPoint[1]]
          : [raw.spawnPoint.x, raw.spawnPoint.y])
      : undefined;

    const collectibles = (raw.collectibles || []).map((c: any) => ({
      id: c.id,
      type: c.type,
      x: c.pos ? c.pos[0] : (c.x ?? 0),
      y: c.pos ? c.pos[1] : (c.y ?? 0),
    }));

    return {
      $schema: raw.$schema || './schemas/room.schema.json',
      id: raw.id,
      coords,
      title: raw.title || `Sector ${coords[0]},${coords[1]}`,
      subtitle: raw.subtitle,
      themeColor: raw.themeColor || '#00e5ff',
      accentColor: raw.accentColor || '#0066ff',
      exits: {
        left: !!raw.exits?.left,
        right: !!raw.exits?.right,
        up: !!raw.exits?.up,
        down: !!raw.exits?.down,
      },
      spawnPoint,
      grid: normalizeGrid(raw.grid || []),
      collectibles,
      bounceProps: raw.bounceProps || {},
      spikeProps: raw.spikeProps || {},
      movingPlatforms: raw.movingPlatforms || [],
      laserBarriers: raw.laserBarriers || [],
      laserTurrets: raw.laserTurrets || [],
    };
  });

  return {
    $schema: DEMO_WORLD_MANIFEST.$schema || './schemas/world.schema.json',
    id: DEMO_WORLD_MANIFEST.id || 'demo',
    title: DEMO_WORLD_MANIFEST.title || 'Infinite Tesseract',
    description: DEMO_WORLD_MANIFEST.description,
    startingCoords,
    rooms,
  };
}
