"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDemoLevel = buildDemoLevel;
const ScreenData_1 = require("./ScreenData");
const LevelMap_1 = require("./LevelMap");
function createBlankRoom() {
    const grid = [];
    for (let r = 0; r < ScreenData_1.ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < ScreenData_1.COLS; c++) {
            grid[r][c] = ScreenData_1.TileType.EMPTY;
        }
    }
    return grid;
}
// Helper to fill rectangular areas
function fillBox(grid, r1, c1, r2, c2, tile) {
    for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
            if (r >= 0 && r < ScreenData_1.ROWS && c >= 0 && c < ScreenData_1.COLS) {
                grid[r][c] = tile;
            }
        }
    }
}
// Helper to place bounce pads with custom propulsion properties on the map
function setBouncePad(grid, bounceProps, r, c, config) {
    if (r >= 0 && r < ScreenData_1.ROWS && c >= 0 && c < ScreenData_1.COLS) {
        grid[r][c] = ScreenData_1.TileType.BOUNCE;
        if (config) {
            bounceProps[`${r},${c}`] = { ...config };
        }
    }
}
function fillBouncePads(grid, bounceProps, r1, c1, r2, c2, config) {
    for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
            setBouncePad(grid, bounceProps, r, c, config);
        }
    }
}
// Add boundary walls while leaving specified exit gaps open
function addEnclosure(grid, exits) {
    // Top wall
    for (let c = 0; c < ScreenData_1.COLS; c++) {
        if (!exits.up || (c < 7 || c > 12)) {
            grid[0][c] = ScreenData_1.TileType.SOLID;
        }
    }
    // Bottom wall
    for (let c = 0; c < ScreenData_1.COLS; c++) {
        if (!exits.down || (c < 7 || c > 12)) {
            grid[ScreenData_1.ROWS - 1][c] = ScreenData_1.TileType.SOLID;
        }
    }
    // Left wall
    for (let r = 0; r < ScreenData_1.ROWS; r++) {
        if (!exits.left || (r < 12 || r > 17)) {
            grid[r][0] = ScreenData_1.TileType.SOLID;
        }
    }
    // Right wall
    for (let r = 0; r < ScreenData_1.ROWS; r++) {
        if (!exits.right || (r < 12 || r > 17)) {
            grid[r][ScreenData_1.COLS - 1] = ScreenData_1.TileType.SOLID;
        }
    }
}
function buildDemoLevel() {
    const map = new LevelMap_1.LevelMap();
    // ==========================================
    // ROOM (0, 0): GENESIS CHAMBER
    // ==========================================
    {
        const tiles = createBlankRoom();
        const exits = { left: false, right: true, up: false, down: false };
        addEnclosure(tiles, exits);
        // Floor
        fillBox(tiles, 18, 0, 18, 19, ScreenData_1.TileType.SOLID);
        // Introductory steps
        fillBox(tiles, 16, 6, 16, 9, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 14, 11, 14, 14, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 16, 16, 16, 19, ScreenData_1.TileType.SOLID);
        const room = {
            id: 'room_0_0',
            coords: { x: 0, y: 0 },
            title: 'Sector 0: Genesis Core',
            subtitle: 'Use A/D or Arrow keys to move, Space/W to jump',
            themeColor: '#00ffff', // Cyan
            accentColor: '#0088ff',
            tiles,
            collectibles: [
                { id: 'core_0_0_1', x: 280, y: 500, type: 'core' },
                { id: 'core_0_0_2', x: 500, y: 420, type: 'core' },
            ],
            exits,
            spawnPoint: { x: 120, y: 680 },
        };
        map.addRoom(room);
    }
    // ==========================================
    // ROOM (1, 0): NEON NEXUS
    // ==========================================
    {
        const tiles = createBlankRoom();
        const exits = { left: true, right: true, up: false, down: false };
        addEnclosure(tiles, exits);
        // Floor with small gap
        fillBox(tiles, 18, 0, 18, 6, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 18, 13, 18, 19, ScreenData_1.TileType.SOLID);
        // One-way jump-through platforms across gap
        fillBox(tiles, 16, 7, 16, 12, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 13, 4, 13, 8, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 11, 10, 11, 15, ScreenData_1.TileType.ONE_WAY);
        // Spikes in bottom pit
        fillBox(tiles, 19, 7, 19, 12, ScreenData_1.TileType.SPIKE);
        const room = {
            id: 'room_1_0',
            coords: { x: 1, y: 0 },
            title: 'Sector 1: Neon Nexus',
            subtitle: 'Ride the maglev hover sled across the hazardous spike chasm!',
            themeColor: '#ff00aa', // Magenta
            accentColor: '#ff0055',
            tiles,
            movingPlatforms: [
                {
                    id: 'plat_1_0_1',
                    startX: 240,
                    startY: 590,
                    endX: 480,
                    endY: 590,
                    width: 80,
                    height: 16,
                    speed: 120,
                    pauseTime: 0.5,
                    themeColor: '#00ffff',
                },
            ],
            collectibles: [
                { id: 'core_1_0_1', x: 240, y: 380, type: 'core' },
                { id: 'core_1_0_2', x: 480, y: 300, type: 'prism' },
            ],
            exits,
            spawnPoint: { x: 120, y: 680 },
        };
        map.addRoom(room);
    }
    // ==========================================
    // ROOM (2, 0): THE CROSSROADS
    // ==========================================
    {
        const tiles = createBlankRoom();
        const exits = { left: true, right: true, up: true, down: false };
        addEnclosure(tiles, exits);
        // Floor
        fillBox(tiles, 18, 0, 18, 19, ScreenData_1.TileType.SOLID);
        const bounceProps = {};
        // Super bounce pad launching straight into the sky through the ceiling into Sector (2,1)
        fillBouncePads(tiles, bounceProps, 17, 8, 17, 11, { vy: -1550 });
        // Stepping stones to right exit
        fillBox(tiles, 15, 14, 15, 19, ScreenData_1.TileType.SOLID);
        // Stepped climbing platforms for alternative vertical ascent
        fillBox(tiles, 15, 2, 15, 5, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 11, 3, 11, 6, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 11, 13, 11, 16, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 7, 4, 7, 7, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 7, 12, 7, 15, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 4, 5, 4, 7, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 4, 12, 4, 14, ScreenData_1.TileType.ONE_WAY);
        const room = {
            id: 'room_2_0',
            coords: { x: 2, y: 0 },
            title: 'Sector 2: Quantum Junction',
            subtitle: 'Use the Super Bounce Pad or climb the platforms to reach Sector (2,1) UP!',
            themeColor: '#00ff88', // Emerald Neon
            accentColor: '#00cc66',
            tiles,
            bounceProps,
            collectibles: [
                { id: 'core_2_0_1', x: 400, y: 400, type: 'core' },
                { id: 'core_2_0_2', x: 620, y: 480, type: 'core' },
            ],
            exits,
            spawnPoint: { x: 120, y: 680 },
        };
        map.addRoom(room);
    }
    // ==========================================
    // ROOM (3, 0): PHASE SPIKES
    // ==========================================
    {
        const tiles = createBlankRoom();
        const exits = { left: true, right: true, up: false, down: false };
        addEnclosure(tiles, exits);
        // Lower pit of spikes
        fillBox(tiles, 18, 3, 18, 16, ScreenData_1.TileType.SPIKE);
        fillBox(tiles, 18, 0, 18, 2, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 18, 17, 18, 19, ScreenData_1.TileType.SOLID);
        // Stepping pillars
        fillBox(tiles, 16, 5, 17, 6, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 14, 9, 17, 10, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 15, 13, 17, 14, ScreenData_1.TileType.SOLID);
        const room = {
            id: 'room_3_0',
            coords: { x: 3, y: 0 },
            title: 'Sector 3: Laser Grid',
            subtitle: 'Ride the plasma skiff over the laser grid spikes',
            themeColor: '#ffaa00', // Amber
            accentColor: '#ff6600',
            tiles,
            movingPlatforms: [
                {
                    id: 'plat_3_0_1',
                    startX: 220,
                    startY: 500,
                    endX: 500,
                    endY: 500,
                    width: 80,
                    height: 16,
                    speed: 140,
                    pauseTime: 0.4,
                    themeColor: '#ffaa00',
                },
            ],
            collectibles: [
                { id: 'core_3_0_1', x: 240, y: 500, type: 'core' },
                { id: 'core_3_0_2', x: 400, y: 420, type: 'prism' },
                { id: 'core_3_0_3', x: 560, y: 460, type: 'core' },
            ],
            exits,
            spawnPoint: { x: 60, y: 680 },
        };
        map.addRoom(room);
    }
    // ==========================================
    // ROOM (4, 0): TESSERACT CHASM
    // ==========================================
    {
        const tiles = createBlankRoom();
        const exits = { left: true, right: true, up: false, down: true };
        addEnclosure(tiles, exits);
        // Left ledge
        fillBox(tiles, 18, 0, 18, 5, ScreenData_1.TileType.SOLID);
        // Right ledge
        fillBox(tiles, 18, 14, 18, 19, ScreenData_1.TileType.SOLID);
        // Stepping stones to and from crumble platforms
        tiles[17][5] = ScreenData_1.TileType.SOLID;
        tiles[17][14] = ScreenData_1.TileType.SOLID;
        // Middle crumbling platforms over bottom pit to (4, -1)
        fillBox(tiles, 16, 7, 16, 9, ScreenData_1.TileType.CRUMBLE);
        fillBox(tiles, 15, 11, 15, 13, ScreenData_1.TileType.CRUMBLE);
        const room = {
            id: 'room_4_0',
            coords: { x: 4, y: 0 },
            title: 'Sector 4: Gravity Well',
            subtitle: 'Drop DOWN into the Crypt (4,-1) or ride across the void',
            themeColor: '#aa00ff', // Violet
            accentColor: '#7700cc',
            tiles,
            movingPlatforms: [
                {
                    id: 'plat_4_0_1',
                    startX: 240,
                    startY: 520,
                    endX: 520,
                    endY: 520,
                    width: 80,
                    height: 16,
                    speed: 130,
                    pauseTime: 0.5,
                    themeColor: '#aa00ff',
                },
            ],
            collectibles: [
                { id: 'core_4_0_1', x: 320, y: 440, type: 'core' },
                { id: 'core_4_0_2', x: 480, y: 400, type: 'core' },
            ],
            exits,
            spawnPoint: { x: 120, y: 680 },
        };
        map.addRoom(room);
    }
    // ==========================================
    // ROOM (5, 0): THE 6TH DIMENSION
    // ==========================================
    {
        const tiles = createBlankRoom();
        const exits = { left: true, right: true, up: false, down: false };
        addEnclosure(tiles, exits);
        // Floor
        fillBox(tiles, 18, 0, 18, 19, ScreenData_1.TileType.SOLID);
        // Stepped quantum platforms climbing from both sides to the center
        // Lower side steps (Row 16: y = 640)
        fillBox(tiles, 16, 2, 16, 5, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 16, 14, 16, 17, ScreenData_1.TileType.ONE_WAY);
        // Mid side steps (Row 14: y = 560)
        fillBox(tiles, 14, 4, 14, 7, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 14, 12, 14, 15, ScreenData_1.TileType.ONE_WAY);
        // Center summit platform (Row 12: y = 480) - ONE_WAY to allow seamless ascent
        fillBox(tiles, 12, 8, 12, 11, ScreenData_1.TileType.ONE_WAY);
        const room = {
            id: 'room_5_0',
            coords: { x: 5, y: 0 },
            title: 'Sector 5: Beyond Euclidean Space',
            subtitle: 'Ride the dimensional shuttle between quantum platforms',
            themeColor: '#00e5ff', // Electric Cyan
            accentColor: '#0099ff',
            tiles,
            movingPlatforms: [
                {
                    id: 'plat_5_0_1',
                    startX: 220,
                    startY: 400,
                    endX: 580,
                    endY: 400,
                    width: 80,
                    height: 16,
                    speed: 150,
                    pauseTime: 0.4,
                    themeColor: '#00e5ff',
                },
            ],
            collectibles: [
                { id: 'core_5_0_1', x: 220, y: 460, type: 'prism' },
                { id: 'core_5_0_2', x: 400, y: 340, type: 'prism' },
                { id: 'core_5_0_3', x: 580, y: 460, type: 'core' },
            ],
            exits,
            spawnPoint: { x: 120, y: 680 },
        };
        map.addRoom(room);
    }
    // ==========================================
    // ROOM (6, 0): THE PRISM HORIZON (FINISH)
    // ==========================================
    {
        const tiles = createBlankRoom();
        const exits = { left: true, right: false, up: false, down: false };
        addEnclosure(tiles, exits);
        // Floor
        fillBox(tiles, 18, 0, 18, 19, ScreenData_1.TileType.SOLID);
        // Pedestal for the goal portal
        fillBox(tiles, 17, 13, 17, 17, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 16, 14, 16, 16, ScreenData_1.TileType.SOLID);
        tiles[15][15] = ScreenData_1.TileType.GOAL;
        // Platform leadup
        fillBox(tiles, 15, 5, 15, 8, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 13, 9, 13, 11, ScreenData_1.TileType.ONE_WAY);
        const room = {
            id: 'room_6_0',
            coords: { x: 6, y: 0 },
            title: 'Sector 6: Prism Horizon',
            subtitle: 'Sector #7 reached! Enter the Warp Core to finish!',
            themeColor: '#ff0055', // Radiant Crimson
            accentColor: '#ffcc00',
            tiles,
            collectibles: [
                { id: 'core_6_0_1', x: 260, y: 460, type: 'prism' },
                { id: 'core_6_0_2', x: 420, y: 380, type: 'prism' },
            ],
            exits,
            spawnPoint: { x: 120, y: 680 },
        };
        map.addRoom(room);
    }
    // ==========================================
    // ROOM (2, 1): UPPER ASCENT
    // ==========================================
    {
        const tiles = createBlankRoom();
        const exits = { left: false, right: false, up: true, down: true };
        addEnclosure(tiles, exits);
        // Floor ledges on left and right of vertical descent chute (cols 7-12)
        fillBox(tiles, 18, 0, 18, 6, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 18, 13, 18, 19, ScreenData_1.TileType.SOLID);
        const bounceProps = {};
        // Bounce pads on floor for quick ascent return
        setBouncePad(tiles, bounceProps, 17, 1, { vy: -900 });
        setBouncePad(tiles, bounceProps, 17, 18, { vy: -900 });
        // Solid base for side blocks
        fillBox(tiles, 16, 2, 16, 5, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 16, 14, 16, 17, ScreenData_1.TileType.SOLID);
        // Side ledges (Solid blocks)
        fillBox(tiles, 15, 2, 15, 6, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 15, 13, 15, 17, ScreenData_1.TileType.SOLID);
        // One-way landing steps extending from the side ledges into the chute
        // This allows the player to easily land on either side without getting blocked from below
        fillBox(tiles, 14, 5, 14, 7, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 14, 12, 14, 14, ScreenData_1.TileType.ONE_WAY);
        // Middle one-way platforms
        fillBox(tiles, 12, 7, 12, 12, ScreenData_1.TileType.ONE_WAY);
        // Stepping platforms to easily climb from row 12 to row 8
        fillBox(tiles, 10, 4, 10, 7, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 10, 12, 10, 15, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 8, 4, 8, 8, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 8, 11, 8, 15, ScreenData_1.TileType.ONE_WAY);
        // Bounce pad to reach upper ceiling room (2, 2)
        setBouncePad(tiles, bounceProps, 7, 9, { vy: -1200 });
        setBouncePad(tiles, bounceProps, 7, 10, { vy: -1200 });
        const room = {
            id: 'room_2_1',
            coords: { x: 2, y: 1 },
            title: 'Sector (2,1): The Spire',
            subtitle: 'Ride the vertical maglev lift to ascend the spire',
            themeColor: '#39ff14', // Neon Green
            accentColor: '#00aa33',
            tiles,
            bounceProps,
            movingPlatforms: [
                {
                    id: 'plat_2_1_1',
                    startX: 360,
                    startY: 440,
                    endX: 360,
                    endY: 320,
                    width: 80,
                    height: 16,
                    speed: 80,
                    pauseTime: 0.5,
                    themeColor: '#39ff14',
                },
            ],
            collectibles: [
                { id: 'core_2_1_1', x: 180, y: 460, type: 'core' },
                { id: 'core_2_1_2', x: 600, y: 460, type: 'core' },
                { id: 'core_2_1_3', x: 390, y: 200, type: 'prism' },
            ],
            exits,
            spawnPoint: { x: 120, y: 680 },
        };
        map.addRoom(room);
    }
    // ==========================================
    // ROOM (2, 2): STARLIGHT ZENITH
    // ==========================================
    {
        const tiles = createBlankRoom();
        const exits = { left: false, right: false, up: false, down: true };
        addEnclosure(tiles, exits);
        // Floor ledges on left and right of vertical descent chute (cols 7-12)
        fillBox(tiles, 18, 0, 18, 6, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 18, 13, 18, 19, ScreenData_1.TileType.SOLID);
        const bounceProps = {};
        // Bounce pads on floor to fling player up towards master prisms
        setBouncePad(tiles, bounceProps, 17, 2, { vy: -1400 });
        setBouncePad(tiles, bounceProps, 17, 17, { vy: -1400 });
        // Stepping stones
        fillBox(tiles, 15, 4, 15, 6, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 15, 13, 15, 15, ScreenData_1.TileType.SOLID);
        // One-way landing platform over the entrance chute (allows jumping through from (2,1)!)
        fillBox(tiles, 16, 7, 16, 12, ScreenData_1.TileType.ONE_WAY);
        // High floating clouds/platforms
        fillBox(tiles, 13, 3, 13, 7, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 13, 12, 13, 16, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 9, 8, 9, 11, ScreenData_1.TileType.SOLID);
        const room = {
            id: 'room_2_2',
            coords: { x: 2, y: 2 },
            title: 'Sector (2,2): Starlight Zenith',
            subtitle: 'Ride the solar cruiser across the zenith manifold',
            themeColor: '#ffe600', // Gold Solar
            accentColor: '#ff8800',
            tiles,
            bounceProps,
            movingPlatforms: [
                {
                    id: 'plat_2_2_1',
                    startX: 220,
                    startY: 460,
                    endX: 580,
                    endY: 460,
                    width: 80,
                    height: 16,
                    speed: 130,
                    pauseTime: 0.5,
                    themeColor: '#ffe600',
                },
            ],
            collectibles: [
                { id: 'core_2_2_1', x: 200, y: 380, type: 'prism' },
                { id: 'core_2_2_2', x: 600, y: 380, type: 'prism' },
                { id: 'core_2_2_3', x: 400, y: 220, type: 'prism' },
            ],
            exits,
            spawnPoint: { x: 120, y: 680 },
        };
        map.addRoom(room);
    }
    // ==========================================
    // ROOM (4, -1): SUB-ZERO CRYPT (SECRET UNDERGROUND)
    // ==========================================
    {
        const tiles = createBlankRoom();
        const exits = { left: false, right: false, up: true, down: false };
        addEnclosure(tiles, exits);
        // Deep pit floor with bounce return
        fillBox(tiles, 18, 0, 18, 19, ScreenData_1.TileType.SOLID);
        fillBox(tiles, 17, 3, 17, 6, ScreenData_1.TileType.SPIKE);
        fillBox(tiles, 17, 13, 17, 16, ScreenData_1.TileType.SPIKE);
        // Secret treasure platform directly under entrance chute (ONE_WAY allows vaulting straight through!)
        fillBox(tiles, 14, 8, 14, 11, ScreenData_1.TileType.ONE_WAY);
        // Safe stepping one-way ledges to navigate between side and center
        fillBox(tiles, 15, 4, 15, 6, ScreenData_1.TileType.ONE_WAY);
        fillBox(tiles, 15, 13, 15, 15, ScreenData_1.TileType.ONE_WAY);
        const bounceProps = {};
        // Center Super Bounce Pad aligned directly with the roof opening (cols 7-12) to vault back up into Sector (4,0)
        fillBouncePads(tiles, bounceProps, 17, 7, 17, 12, { vy: -1550 });
        // Corner bounce pads to recover from side pits and vault inward toward center
        setBouncePad(tiles, bounceProps, 17, 1, { vy: -1100, vx: 200 });
        setBouncePad(tiles, bounceProps, 17, 2, { vy: -1100, vx: 200 });
        setBouncePad(tiles, bounceProps, 17, 17, { vy: -1100, vx: -200 });
        setBouncePad(tiles, bounceProps, 17, 18, { vy: -1100, vx: -200 });
        const room = {
            id: 'room_4_minus1',
            coords: { x: 4, y: -1 },
            title: 'Sector (4,-1): Sub-Zero Crypt',
            subtitle: 'Secret deep vault! Use the bounce pads to vault back up',
            themeColor: '#0033ff', // Deep Indigo Neon
            accentColor: '#00ffff',
            tiles,
            bounceProps,
            collectibles: [
                { id: 'core_4_m1_1', x: 400, y: 420, type: 'prism' },
                { id: 'core_4_m1_2', x: 380, y: 200, type: 'prism' },
            ],
            exits,
            spawnPoint: { x: 400, y: 520 },
        };
        map.addRoom(room);
    }
    return map;
}
