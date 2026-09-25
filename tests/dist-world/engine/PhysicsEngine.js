"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhysicsEngine = void 0;
const MovingPlatform_1 = require("../entities/MovingPlatform");
const LaserBarrier_1 = require("../entities/LaserBarrier");
const LaserTurret_1 = require("../entities/LaserTurret");
const ScreenData_1 = require("../world/ScreenData");
class PhysicsEngine {
    audio;
    particles;
    crumblingTiles = new Map();
    gameTime = 0;
    roomPlatforms = new Map();
    roomBarriers = new Map();
    roomTurrets = new Map();
    roomProjectiles = new Map();
    levelMap = null;
    lastLockedSoundTime = 0;
    constructor(audio, particles) {
        this.audio = audio;
        this.particles = particles;
    }
    getPlatformsForRoom(room, time) {
        const t = time ?? this.gameTime;
        if (!room.movingPlatforms || room.movingPlatforms.length === 0) {
            return [];
        }
        let platforms = this.roomPlatforms.get(room.id);
        const matches = platforms && platforms.length === room.movingPlatforms.length &&
            platforms.every((plat, idx) => plat.config === room.movingPlatforms[idx]);
        if (!matches) {
            platforms = room.movingPlatforms.map((cfg) => new MovingPlatform_1.MovingPlatform(cfg, t));
            this.roomPlatforms.set(room.id, platforms);
        }
        for (const plat of platforms) {
            plat.update(t);
        }
        return platforms;
    }
    getBarriersForRoom(room, time) {
        const t = time ?? this.gameTime;
        if (!room.laserBarriers || room.laserBarriers.length === 0) {
            return [];
        }
        let barriers = this.roomBarriers.get(room.id);
        const matches = barriers && barriers.length === room.laserBarriers.length &&
            barriers.every((bar, idx) => bar.config === room.laserBarriers[idx]);
        if (!matches) {
            barriers = room.laserBarriers.map((cfg) => new LaserBarrier_1.LaserBarrier(cfg, t));
            this.roomBarriers.set(room.id, barriers);
        }
        for (const barrier of barriers) {
            barrier.update(t);
        }
        return barriers;
    }
    getTurretsForRoom(room) {
        if (!room.laserTurrets || room.laserTurrets.length === 0) {
            return [];
        }
        let turrets = this.roomTurrets.get(room.id);
        const matches = turrets && turrets.length === room.laserTurrets.length &&
            turrets.every((tur, idx) => tur.config === room.laserTurrets[idx]);
        if (!matches) {
            turrets = room.laserTurrets.map((cfg) => new LaserTurret_1.LaserTurret(cfg));
            this.roomTurrets.set(room.id, turrets);
        }
        return turrets;
    }
    getProjectilesForRoom(roomId) {
        return this.roomProjectiles.get(roomId) ?? [];
    }
    clearProjectiles() {
        this.roomProjectiles.clear();
    }
    clearAllRoomsCache() {
        this.roomPlatforms.clear();
        this.roomBarriers.clear();
        this.roomTurrets.clear();
        this.roomProjectiles.clear();
        this.resetCrumblingTiles();
    }
    resetCrumblingTiles() {
        for (const [, item] of this.crumblingTiles) {
            item.room.tiles[item.r][item.c] = ScreenData_1.TileType.CRUMBLE;
        }
        this.crumblingTiles.clear();
        this.clearProjectiles();
    }
    updateCrumble(dt) {
        for (const [key, item] of this.crumblingTiles) {
            item.timer -= dt;
            if (item.state === 'shaking') {
                if (Math.random() < 0.25) {
                    this.particles.emitDust((item.c + 0.5) * ScreenData_1.TILE_SIZE, (item.r + 0.5) * ScreenData_1.TILE_SIZE, 2, item.room.themeColor);
                }
                if (item.timer <= 0) {
                    item.room.tiles[item.r][item.c] = ScreenData_1.TileType.EMPTY;
                    item.state = 'broken';
                    item.timer = 2.5;
                    this.audio.playLand();
                    this.particles.emitSparks((item.c + 0.5) * ScreenData_1.TILE_SIZE, (item.r + 0.5) * ScreenData_1.TILE_SIZE, 12, item.room.themeColor);
                }
            }
            else if (item.state === 'broken') {
                if (item.timer <= 0) {
                    item.room.tiles[item.r][item.c] = ScreenData_1.TileType.CRUMBLE;
                    this.particles.emitDust((item.c + 0.5) * ScreenData_1.TILE_SIZE, (item.r + 0.5) * ScreenData_1.TILE_SIZE, 6, item.room.themeColor);
                    this.crumblingTiles.delete(key);
                }
            }
        }
    }
    triggerCrumble(room, r, c) {
        const key = `${room.id}_${r}_${c}`;
        if (!this.crumblingTiles.has(key)) {
            this.crumblingTiles.set(key, {
                room,
                r,
                c,
                state: 'shaking',
                timer: 0.5,
            });
            this.particles.emitDust((c + 0.5) * ScreenData_1.TILE_SIZE, r * ScreenData_1.TILE_SIZE, 5, room.themeColor);
        }
    }
    setLevelMap(levelMap) {
        this.levelMap = levelMap;
    }
    isExitOpen(room, dir, levelMap) {
        const map = levelMap || this.levelMap;
        const gate = (0, ScreenData_1.getExitGate)(room, dir);
        if (gate) {
            return !!map && map.hasKey(gate.id);
        }
        return room.exits?.[dir] === true;
    }
    update(player, room, input, dt, onGoalReached, onPlayerDeath, currentTime, levelMap, onGateLocked) {
        this.updateCrumble(dt);
        player.wasGrounded = player.isGrounded;
        player.updateTimers(dt);
        this.gameTime = currentTime !== undefined ? currentTime : this.gameTime + dt;
        const platforms = this.getPlatformsForRoom(room, this.gameTime);
        // Handle ducking / crouching input & ceiling constraints
        if (input.down) {
            player.setDucking(true);
        }
        else if (player.isDucking) {
            if (this.canStandUp(player, room, platforms)) {
                player.setDucking(false);
            }
        }
        // 0. Passenger carriage: carry player with platform movement
        if (player.standingPlatform) {
            const plat = player.standingPlatform;
            const isPlatInRoom = platforms.includes(plat);
            const isOverlappingX = player.x + player.width > plat.x && player.x < plat.x + plat.width;
            if (isPlatInRoom && isOverlappingX) {
                const deltaX = plat.x - plat.prevX;
                player.x += deltaX;
                player.y = plat.y - player.height;
                player.isGrounded = true;
                player.vy = 0;
                // Resolve collisions in case the platform moved the player into a solid block
                this.resolveHorizontalCollisions(player, room);
                // If pushing out of wall caused player to leave the platform, dismount
                if (player.x + player.width <= plat.x || player.x >= plat.x + plat.width) {
                    player.standingPlatform = null;
                }
            }
            else {
                // Player stepped off or platform unmounted
                if (isPlatInRoom) {
                    player.vx += plat.vx;
                }
                player.standingPlatform = null;
            }
        }
        // 1. Horizontal Target Velocity
        let targetVx = 0;
        const currentSpeed = player.isDucking ? player.CRAWL_SPEED : player.MOVE_SPEED;
        if (input.left) {
            targetVx -= currentSpeed;
            player.facing = -1;
        }
        if (input.right) {
            targetVx += currentSpeed;
            player.facing = 1;
        }
        if (player.isGrounded) {
            // Ground physics: snappy acceleration & crisp ground deceleration
            player.isBouncePropelled = false;
            if (player.standingPlatform && targetVx === 0) {
                // Standing still on a moving platform: firmly zero out relative horizontal velocity
                // Eliminates unwanted sliding/inertia!
                player.vx = 0;
            }
            else if (targetVx !== 0) {
                if (Math.sign(player.vx) !== Math.sign(targetVx)) {
                    player.vx += targetVx > 0 ? player.DECELERATION * dt : -player.DECELERATION * dt;
                }
                player.vx = this.approach(player.vx, targetVx, player.ACCELERATION * dt);
            }
            else {
                player.vx = this.approach(player.vx, 0, player.DECELERATION * dt);
            }
        }
        else {
            // Airborne physics
            if (player.isBouncePropelled) {
                // Player is riding a bounce launch: preserve horizontal momentum along the parabolic arc
                if (targetVx === 0) {
                    // Coast on launch momentum without ground friction
                }
                else if (Math.sign(targetVx) === Math.sign(player.vx)) {
                    // Holding the launch direction: maintain boosted speed (do not forcibly brake to MOVE_SPEED)
                    if (Math.abs(player.vx) < currentSpeed) {
                        player.vx = this.approach(player.vx, targetVx, player.ACCELERATION * dt);
                    }
                }
                else {
                    // Counter-steering against the launch direction: allow responsive air control redirection
                    player.vx = this.approach(player.vx, targetVx, 1000 * dt);
                }
            }
            else {
                // Regular aerial movement: steer with acceleration, use gentle air drag when neutral
                if (targetVx !== 0) {
                    player.vx = this.approach(player.vx, targetVx, player.ACCELERATION * dt);
                }
                else {
                    player.vx = this.approach(player.vx, 0, 600 * dt);
                }
            }
        }
        // 2. Jump input & Coyote Time & Jump Buffering & Platform Momentum Inheritance & Drop-Through
        if (input.jumpJustPressed) {
            player.jumpBufferTime = player.JUMP_BUFFER_DURATION;
        }
        const canDropThrough = input.down &&
            player.jumpBufferTime > 0 &&
            (player.isGrounded || player.standingPlatform !== null) &&
            this.isStandingOnOneWay(player, room);
        if (canDropThrough) {
            player.dropThroughTimer = 0.20;
            player.isGrounded = false;
            player.coyoteTime = 0;
            player.jumpBufferTime = 0;
            if (player.standingPlatform) {
                player.vy = Math.max(120, player.standingPlatform.vy + 60);
                player.standingPlatform = null;
            }
            else {
                player.vy = 120;
            }
            player.y += 3;
            this.audio.playDropThrough();
            this.particles.emitDust(player.x + player.width * 0.5, player.y + player.height, 6, room.themeColor);
        }
        else if (player.jumpBufferTime > 0 && player.coyoteTime > 0) {
            let jumpVy = player.JUMP_VELOCITY;
            if (player.standingPlatform) {
                const plat = player.standingPlatform;
                if (plat.vy < 0) {
                    // Boost upward jump when launching off an ascending platform
                    jumpVy = Math.min(jumpVy, player.JUMP_VELOCITY + plat.vy * 0.75);
                }
                // Inherit horizontal momentum
                player.vx += plat.vx * 0.8;
                player.standingPlatform = null;
            }
            player.vy = jumpVy;
            player.coyoteTime = 0;
            player.jumpBufferTime = 0;
            player.isGrounded = false;
            this.audio.playJump();
            this.particles.emitDust(player.x + player.width * 0.5, player.y + player.height, 8, room.themeColor);
        }
        // Variable Jump Cut (release jump early - only affects regular jumps, not bounce pads)
        if (!input.jump && player.vy < player.MIN_JUMP_VELOCITY && !player.isBouncePropelled) {
            player.vy = player.MIN_JUMP_VELOCITY;
        }
        // 3. Gravity (only apply when not firmly planted on a moving platform)
        if (!player.standingPlatform) {
            player.vy = Math.min(player.MAX_FALL_SPEED, player.vy + player.GRAVITY * dt);
        }
        else {
            player.vy = 0;
        }
        // 4. Horizontal Movement & Collision
        player.x += player.vx * dt;
        this.resolveHorizontalCollisions(player, room);
        if (this.checkSpikeCollisions(player, room, onPlayerDeath))
            return null;
        // 5. Vertical Movement & Collision
        const prevY = player.y;
        player.y += player.vy * dt;
        player.isGrounded = false;
        this.resolveVerticalCollisions(player, room, prevY, onGoalReached, onPlayerDeath);
        if (this.checkSpikeCollisions(player, room, onPlayerDeath))
            return null;
        // Moving Platform Collisions
        this.resolvePlatformCollisions(player, platforms, prevY, dt);
        // Just landed particle effect
        if (!player.wasGrounded && player.isGrounded) {
            this.audio.playLand();
            this.particles.emitDust(player.x + player.width * 0.5, player.y + player.height, 6, room.themeColor);
        }
        // 6. Laser Hazards Collision & Projectile Simulation
        const barrierKilled = this.checkLaserBarriers(player, room, onPlayerDeath);
        if (barrierKilled)
            return null;
        const turretKilled = this.updateLaserTurrets(player, room, platforms, dt, onPlayerDeath);
        if (turretKilled)
            return null;
        // 7. Check Portals for intra-room relocation or inter-sector warp
        const portalTransition = this.checkPortals(player, room, levelMap);
        if (portalTransition) {
            return portalTransition;
        }
        // 8. Check Edge Boundaries for 3D Cube Rotation
        return this.checkBoundaryTransitions(player, room, levelMap, onGateLocked);
    }
    canStandUp(player, room, platforms) {
        if (!player.isDucking)
            return true;
        const diff = player.STANDING_HEIGHT - player.height;
        if (diff <= 0)
            return true;
        const headY = player.y - diff;
        const minCol = Math.floor((player.x + 2) / ScreenData_1.TILE_SIZE);
        const maxCol = Math.floor((player.x + player.width - 2) / ScreenData_1.TILE_SIZE);
        const minRow = Math.floor(headY / ScreenData_1.TILE_SIZE);
        const maxRow = Math.floor((player.y - 1) / ScreenData_1.TILE_SIZE);
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (r < 0) {
                    // Solid ceiling if room doesn't have an upward exit
                    if (!room.exits.up)
                        return false;
                    continue;
                }
                if (r >= room.tiles.length || c < 0 || c >= room.tiles[0].length)
                    continue;
                const tile = room.tiles[r][c];
                if (tile === ScreenData_1.TileType.SOLID) {
                    return false;
                }
            }
        }
        if (platforms) {
            for (const plat of platforms) {
                if (plat.oneWay)
                    continue;
                const overlapX = player.x + player.width - 2 > plat.x && player.x + 2 < plat.x + plat.width;
                const overlapY = player.y > plat.y && headY < plat.y + plat.height;
                if (overlapX && overlapY) {
                    return false;
                }
            }
        }
        return true;
    }
    approach(current, target, maxDelta) {
        if (current < target) {
            return Math.min(current + maxDelta, target);
        }
        return Math.max(current - maxDelta, target);
    }
    isStandingOnOneWay(player, room) {
        if (player.standingPlatform) {
            return player.standingPlatform.oneWay !== false;
        }
        if (!player.isGrounded) {
            return false;
        }
        const feetY = player.y + player.height;
        const r = Math.floor((feetY + 1) / ScreenData_1.TILE_SIZE);
        if (r < 0 || r >= room.tiles.length)
            return false;
        const minCol = Math.floor((player.x + 2) / ScreenData_1.TILE_SIZE);
        const maxCol = Math.floor((player.x + player.width - 2) / ScreenData_1.TILE_SIZE);
        let hasOneWay = false;
        for (let c = minCol; c <= maxCol; c++) {
            if (c < 0 || c >= room.tiles[0].length)
                continue;
            const tile = room.tiles[r][c];
            if (tile === ScreenData_1.TileType.SOLID) {
                return false;
            }
            if (tile === ScreenData_1.TileType.ONE_WAY || tile === ScreenData_1.TileType.CRUMBLE) {
                hasOneWay = true;
            }
        }
        return hasOneWay;
    }
    resolveHorizontalCollisions(player, room) {
        const minCol = Math.floor(player.x / ScreenData_1.TILE_SIZE);
        const maxCol = Math.floor((player.x + player.width) / ScreenData_1.TILE_SIZE);
        const minRow = Math.floor(player.y / ScreenData_1.TILE_SIZE);
        const maxRow = Math.floor((player.y + player.height - 1) / ScreenData_1.TILE_SIZE);
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (r < 0 || r >= room.tiles.length || c < 0 || c >= room.tiles[0].length)
                    continue;
                const tile = room.tiles[r][c];
                if (tile === ScreenData_1.TileType.SOLID || tile === ScreenData_1.TileType.BOUNCE) {
                    if (player.vx > 0) {
                        player.x = c * ScreenData_1.TILE_SIZE - player.width;
                        player.vx = 0;
                    }
                    else if (player.vx < 0) {
                        player.x = (c + 1) * ScreenData_1.TILE_SIZE;
                        player.vx = 0;
                    }
                }
            }
        }
    }
    resolveVerticalCollisions(player, room, prevY, onGoalReached, onPlayerDeath) {
        const minCol = Math.floor((player.x + 2) / ScreenData_1.TILE_SIZE);
        const maxCol = Math.floor((player.x + player.width - 2) / ScreenData_1.TILE_SIZE);
        const minRow = Math.floor(player.y / ScreenData_1.TILE_SIZE);
        const maxRow = Math.floor((player.y + player.height) / ScreenData_1.TILE_SIZE);
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (r < 0 || r >= room.tiles.length || c < 0 || c >= room.tiles[0].length)
                    continue;
                const tile = room.tiles[r][c];
                const tileTop = r * ScreenData_1.TILE_SIZE;
                const tileBottom = (r + 1) * ScreenData_1.TILE_SIZE;
                if (tile === ScreenData_1.TileType.SOLID) {
                    if (player.vy > 0) {
                        player.y = tileTop - player.height;
                        player.vy = 0;
                        player.isGrounded = true;
                        player.standingPlatform = null;
                    }
                    else if (player.vy < 0) {
                        player.y = tileBottom;
                        player.vy = 0;
                    }
                }
                else if (tile === ScreenData_1.TileType.ONE_WAY) {
                    if (player.dropThroughTimer > 0) {
                        continue;
                    }
                    // One-way platform: only collide if falling and previously above
                    if (player.vy > 0 && prevY + player.height <= tileTop + 8 && player.y + player.height >= tileTop) {
                        player.y = tileTop - player.height;
                        player.vy = 0;
                        player.isGrounded = true;
                        player.standingPlatform = null;
                    }
                }
                else if (tile === ScreenData_1.TileType.CRUMBLE) {
                    if (player.dropThroughTimer > 0) {
                        continue;
                    }
                    // Crumble platform: acts as a jump-through platform from below that shakes and collapses
                    if (player.vy > 0 && prevY + player.height <= tileTop + 8 && player.y + player.height >= tileTop) {
                        player.y = tileTop - player.height;
                        player.vy = 0;
                        player.isGrounded = true;
                        player.standingPlatform = null;
                        this.triggerCrumble(room, r, c);
                    }
                }
                else if (tile === ScreenData_1.TileType.BOUNCE) {
                    // Only trigger bounce when landing from above (like ONE_WAY), not from the side
                    if (player.vy > 0 && prevY + player.height <= tileTop + 8 && player.y + player.height >= tileTop) {
                        player.y = tileTop - player.height;
                        // Retrieve propulsion properties directly from the bounce tile configuration on the map
                        const bounceConfig = room.bounceProps?.[`${r},${c}`];
                        player.vy = bounceConfig?.vy ?? -1400;
                        if (bounceConfig?.vx !== undefined) {
                            player.vx = bounceConfig.vx;
                        }
                        player.isGrounded = false;
                        player.isBouncePropelled = true;
                        player.standingPlatform = null;
                        this.audio.playBounce();
                        this.particles.emitDust(player.x + player.width * 0.5, player.y + player.height, 16, '#39ff14');
                        this.particles.emitSparks(player.x + player.width * 0.5, player.y + player.height, 12, '#00ffff');
                    }
                }
                else if (tile === ScreenData_1.TileType.SPIKE) {
                    // Spike hazard hit
                    if (this.checkSpikeCollisions(player, room, onPlayerDeath)) {
                        return;
                    }
                }
                else if (tile === ScreenData_1.TileType.GOAL) {
                    if (onGoalReached) {
                        onGoalReached();
                    }
                }
            }
        }
    }
    checkSpikeCollisions(player, room, onPlayerDeath) {
        const minCol = Math.floor((player.x - 2) / ScreenData_1.TILE_SIZE);
        const maxCol = Math.floor((player.x + player.width + 2) / ScreenData_1.TILE_SIZE);
        const minRow = Math.floor((player.y - 2) / ScreenData_1.TILE_SIZE);
        const maxRow = Math.floor((player.y + player.height + 2) / ScreenData_1.TILE_SIZE);
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (r < 0 || r >= room.tiles.length || c < 0 || c >= room.tiles[0].length)
                    continue;
                if (room.tiles[r][c] === ScreenData_1.TileType.SPIKE) {
                    const dir = (0, ScreenData_1.getSpikeDirection)(room, r, c);
                    const tLeft = c * ScreenData_1.TILE_SIZE;
                    const tRight = tLeft + ScreenData_1.TILE_SIZE;
                    const tTop = r * ScreenData_1.TILE_SIZE;
                    const tBottom = tTop + ScreenData_1.TILE_SIZE;
                    let hLeft = tLeft;
                    let hRight = tRight;
                    let hTop = tTop;
                    let hBottom = tBottom;
                    // Forgiving hitbox matching spike tip geometry
                    if (dir === 'up') {
                        hLeft += 4;
                        hRight -= 4;
                        hTop += 10;
                    }
                    else if (dir === 'down') {
                        hLeft += 4;
                        hRight -= 4;
                        hBottom -= 10;
                    }
                    else if (dir === 'right') {
                        hTop += 4;
                        hBottom -= 4;
                        hRight -= 10;
                    }
                    else if (dir === 'left') {
                        hTop += 4;
                        hBottom -= 4;
                        hLeft += 10;
                    }
                    if (player.x + player.width > hLeft &&
                        player.x < hRight &&
                        player.y + player.height > hTop &&
                        player.y < hBottom) {
                        player.standingPlatform = null;
                        this.audio.playDeath();
                        this.particles.emitPlayerExplosion(player.x + player.width * 0.5, player.y + player.height * 0.5, player.primaryColor, player.accentColor);
                        if (onPlayerDeath)
                            onPlayerDeath();
                        return true;
                    }
                }
            }
        }
        return false;
    }
    resolvePlatformCollisions(player, platforms, prevY, dt) {
        if (platforms.length === 0)
            return;
        for (const plat of platforms) {
            if (player.dropThroughTimer > 0 && plat.oneWay) {
                continue;
            }
            const platTop = plat.y;
            const platPrevTop = plat.prevY;
            // Horizontal overlap check: player must horizontally overlap the platform
            const overlapX = player.x + player.width > plat.x && player.x < plat.x + plat.width;
            if (!overlapX)
                continue;
            if (player.standingPlatform === plat) {
                player.y = platTop - player.height;
                player.vy = 0;
                player.isGrounded = true;
                return;
            }
            // Check landing: falling or moving onto the platform from above
            if (player.vy >= 0) {
                const prevFeet = prevY + player.height;
                const curFeet = player.y + player.height;
                // Condition A: Feet crossed the surface between frames
                const crossedSurface = prevFeet <= platPrevTop + 8 && curFeet >= platTop;
                // Condition B: Feet are near or on the surface within landing tolerance
                const maxDrop = Math.max(20, player.vy * dt + 12);
                const nearSurface = prevFeet <= platTop + 6 && curFeet >= platTop && curFeet <= platTop + maxDrop;
                if (crossedSurface || nearSurface) {
                    player.y = platTop - player.height;
                    player.vy = 0;
                    player.isGrounded = true;
                    player.standingPlatform = plat;
                    player.vx = 0; // stop horizontal slide on landing
                    return;
                }
            }
        }
    }
    handleLockedGateHit(player, gate, dir, onGateLocked) {
        if (this.gameTime - this.lastLockedSoundTime > 0.6) {
            this.lastLockedSoundTime = this.gameTime;
            if (this.audio.playGateLocked) {
                this.audio.playGateLocked();
            }
        }
        const color = (0, ScreenData_1.getGateColor)(gate.id, gate.color);
        this.particles.emitSparks(player.x + player.width * 0.5, player.y + player.height * 0.5, 6, color);
        if (onGateLocked) {
            onGateLocked(gate, dir);
        }
    }
    checkBoundaryTransitions(player, room, levelMap, onGateLocked) {
        // Right Exit
        if (player.x + player.width * 0.5 >= ScreenData_1.FACE_SIZE) {
            if (this.isExitOpen(room, 'right', levelMap)) {
                return {
                    direction: 'right',
                    entryX: 4,
                    entryY: player.y,
                    preserveVy: player.vy,
                };
            }
            else {
                player.x = ScreenData_1.FACE_SIZE - player.width;
                player.vx = 0;
                const gate = (0, ScreenData_1.getExitGate)(room, 'right');
                if (gate && !(levelMap || this.levelMap)?.hasKey(gate.id)) {
                    this.handleLockedGateHit(player, gate, 'right', onGateLocked);
                }
            }
        }
        // Left Exit
        if (player.x + player.width * 0.5 <= 0) {
            if (this.isExitOpen(room, 'left', levelMap)) {
                return {
                    direction: 'left',
                    entryX: ScreenData_1.FACE_SIZE - player.width - 4,
                    entryY: player.y,
                    preserveVy: player.vy,
                };
            }
            else {
                player.x = 0;
                player.vx = 0;
                const gate = (0, ScreenData_1.getExitGate)(room, 'left');
                if (gate && !(levelMap || this.levelMap)?.hasKey(gate.id)) {
                    this.handleLockedGateHit(player, gate, 'left', onGateLocked);
                }
            }
        }
        // Top Exit
        if (player.y + player.height * 0.5 <= 0) {
            if (this.isExitOpen(room, 'up', levelMap)) {
                return {
                    direction: 'up',
                    entryX: player.x,
                    entryY: ScreenData_1.FACE_SIZE - player.height - 4,
                    preserveVy: Math.min(-200, player.vy), // keep upward thrust
                };
            }
            else {
                player.y = 0;
                player.vy = 0;
                const gate = (0, ScreenData_1.getExitGate)(room, 'up');
                if (gate && !(levelMap || this.levelMap)?.hasKey(gate.id)) {
                    this.handleLockedGateHit(player, gate, 'up', onGateLocked);
                }
            }
        }
        // Bottom Exit
        if (player.y >= ScreenData_1.FACE_SIZE) {
            if (this.isExitOpen(room, 'down', levelMap)) {
                return {
                    direction: 'down',
                    entryX: player.x,
                    entryY: 4,
                    preserveVy: player.vy,
                };
            }
            else {
                const gate = (0, ScreenData_1.getExitGate)(room, 'down');
                if (gate && !(levelMap || this.levelMap)?.hasKey(gate.id)) {
                    player.y = ScreenData_1.FACE_SIZE - player.height;
                    player.vy = 0;
                    this.handleLockedGateHit(player, gate, 'down', onGateLocked);
                }
                else {
                    // Fell into bottom void without exit -> respawn
                    this.audio.playDeath();
                    this.particles.emitPlayerExplosion(player.x + player.width * 0.5, ScreenData_1.FACE_SIZE - 20, player.primaryColor, player.accentColor);
                    return {
                        direction: 'down', // will be treated as fall death if no room
                        entryX: 120,
                        entryY: 660,
                        preserveVy: 0,
                    };
                }
            }
        }
        return null;
    }
    checkPortals(player, room, levelMap) {
        if (!room.portals || room.portals.length === 0) {
            player.disabledPortalId = null;
            return null;
        }
        const map = levelMap || this.levelMap;
        if (!map) return null;

        // Check if player has moved away from the collision box of the portal they emerged from
        if (player.disabledPortalId) {
            const disabledPortal = room.portals.find((p) => p.id === player.disabledPortalId);
            if (disabledPortal) {
                const dpW = disabledPortal.width ?? 44;
                const dpH = disabledPortal.height ?? 68;
                const stillOverlapping =
                    player.x + player.width > disabledPortal.x &&
                    player.x < disabledPortal.x + dpW &&
                    player.y + player.height > disabledPortal.y &&
                    player.y < disabledPortal.y + dpH;

                if (!stillOverlapping) {
                    player.disabledPortalId = null;
                }
            } else {
                player.disabledPortalId = null;
            }
        }

        for (const portal of room.portals) {
            if (!portal.targetPortalId) continue;
            if (portal.id === player.disabledPortalId) continue;

            const portalW = portal.width ?? 44;
            const portalH = portal.height ?? 68;

            const overlap =
                player.x + player.width > portal.x &&
                player.x < portal.x + portalW &&
                player.y + player.height > portal.y &&
                player.y < portal.y + portalH;

            if (!overlap) continue;

            const dest = map.findPortal(portal.targetPortalId);
            if (!dest) continue;

            const destPortal = dest.portal;
            const destRoom = dest.room;
            const destW = destPortal.width ?? 44;
            const destH = destPortal.height ?? 68;

            const targetEntryX = Math.max(4, Math.min(ScreenData_1.FACE_SIZE - player.width - 4, destPortal.x + destW * 0.5 - player.width * 0.5));
            const targetEntryY = Math.max(4, Math.min(ScreenData_1.FACE_SIZE - player.height - 4, destPortal.y + destH - player.height));

            // Disable the destination portal until the player leaves its collision box (if it has a target set)
            if (destPortal.targetPortalId) {
                player.disabledPortalId = destPortal.id;
            } else {
                player.disabledPortalId = null;
            }

            // Invert outbound velocity vector if destination portal has reverseVelocity enabled
            const outboundVx = destPortal.reverseVelocity ? -player.vx : player.vx;
            const outboundVy = destPortal.reverseVelocity ? -player.vy : player.vy;

            // Intra-room teleportation (same room)
            if (destRoom.id === room.id) {
                if (this.particles && this.particles.emitPlayerExplosion) {
                    this.particles.emitPlayerExplosion(
                        portal.x + portalW * 0.5,
                        portal.y + portalH * 0.5,
                        portal.themeColor || room.themeColor,
                        map.getDestinationColor(portal, room)
                    );
                }

                player.setPosition(targetEntryX, targetEntryY);
                player.vx = outboundVx;
                player.vy = outboundVy;
                if (outboundVy < -50) {
                    player.isBouncePropelled = true;
                    player.isGrounded = false;
                }
                player.standingPlatform = null;

                if (this.particles && this.particles.emitSparks) {
                    this.particles.emitSparks(
                        destPortal.x + destW * 0.5,
                        destPortal.y + destH * 0.5,
                        32,
                        destPortal.themeColor || destRoom.themeColor
                    );
                }

                if (this.audio && this.audio.playPortalTeleport) {
                    this.audio.playPortalTeleport();
                }
                return null;
            }

            // Inter-sector teleportation (different room)
            const dx = destRoom.coords.x - room.coords.x;
            const dy = destRoom.coords.y - room.coords.y;
            let rotDir = 'right';
            if (Math.abs(dx) >= Math.abs(dy)) {
                rotDir = dx >= 0 ? 'right' : 'left';
            } else {
                rotDir = dy >= 0 ? 'up' : 'down';
            }

            if (this.particles && this.particles.emitPlayerExplosion) {
                this.particles.emitPlayerExplosion(
                    portal.x + portalW * 0.5,
                    portal.y + portalH * 0.5,
                    portal.themeColor || room.themeColor,
                    map.getDestinationColor(portal, room)
                );
            }

            return {
                direction: rotDir,
                entryX: targetEntryX,
                entryY: targetEntryY,
                preserveVy: outboundVy,
                preserveVx: outboundVx,
                isPortal: true,
                sourcePortal: portal,
                destPortal: destPortal,
                destRoom: destRoom,
                targetCoords: { x: destRoom.coords.x, y: destRoom.coords.y },
            };
        }

        return null;
    }
    checkLaserBarriers(player, room, onPlayerDeath) {
        const barriers = this.getBarriersForRoom(room, this.gameTime);
        for (const barrier of barriers) {
            if (barrier.justEnteredWarning()) {
                this.audio.playLaserWarning();
            }
            if (barrier.justActivated()) {
                this.audio.playLaserHum();
            }
            if (barrier.state.state === 'WARNING') {
                if (Math.random() < 0.25) {
                    this.particles.emitLaserCharge(barrier.state.x1, barrier.state.y1, barrier.themeColor);
                    this.particles.emitLaserCharge(barrier.state.x2, barrier.state.y2, barrier.themeColor);
                }
            }
            else if (barrier.state.isActive) {
                if (Math.random() < 0.15) {
                    this.particles.emitLaserSparks(barrier.state.x1, barrier.state.y1, 2, barrier.themeColor);
                    this.particles.emitLaserSparks(barrier.state.x2, barrier.state.y2, 2, barrier.themeColor);
                }
            }
            if (barrier.intersectsPlayer(player)) {
                player.standingPlatform = null;
                this.audio.playDeath();
                this.particles.emitPlayerExplosion(player.x + player.width * 0.5, player.y + player.height * 0.5, player.primaryColor, barrier.themeColor);
                if (onPlayerDeath)
                    onPlayerDeath();
                return true;
            }
        }
        return false;
    }
    updateLaserTurrets(player, room, platforms, dt, onPlayerDeath) {
        const turrets = this.getTurretsForRoom(room);
        let projectiles = this.roomProjectiles.get(room.id);
        if (!projectiles) {
            projectiles = [];
            this.roomProjectiles.set(room.id, projectiles);
        }
        const playerTarget = player.isAlive
            ? { x: player.x + player.width * 0.5, y: player.y + player.height * 0.5 }
            : null;
        for (const turret of turrets) {
            if (turret.mode === 'beam') {
                turret.updateBeam(this.gameTime, playerTarget);
                const nozzle = turret.getNozzlePosition(playerTarget);
                if (turret.justEnteredWarning()) {
                    this.audio.playLaserWarning();
                }
                if (turret.justActivated()) {
                    this.audio.playLaserHum();
                }
                if (turret.isBeamActive) {
                    const ray = LaserTurret_1.LaserTurret.castRay(nozzle.x, nozzle.y, nozzle.angle, room.tiles, platforms);
                    if (turret.justActivated()) {
                        this.particles.emitLaserSparks(ray.hitX, ray.hitY, 8, turret.themeColor, ray.normalX, ray.normalY);
                    }
                    else if (Math.random() < 0.35) {
                        this.particles.emitLaserSparks(ray.hitX, ray.hitY, 2, turret.themeColor, ray.normalX, ray.normalY);
                    }
                    if (LaserTurret_1.LaserTurret.rayIntersectsPlayer(nozzle.x, nozzle.y, ray.hitX, ray.hitY, player)) {
                        player.standingPlatform = null;
                        this.audio.playDeath();
                        this.particles.emitPlayerExplosion(player.x + player.width * 0.5, player.y + player.height * 0.5, player.primaryColor, turret.themeColor);
                        if (onPlayerDeath)
                            onPlayerDeath();
                        return true;
                    }
                }
                else if (turret.beamState === 'WARNING') {
                    if (Math.random() < 0.25) {
                        this.particles.emitLaserCharge(nozzle.x, nozzle.y, turret.themeColor);
                    }
                }
            }
            else {
                // Projectile mode
                const nozzle = turret.getNozzlePosition(playerTarget);
                const fireInterval = turret.config.fireInterval ?? 2.0;
                const fireOffset = turret.config.fireOffset ?? 0;
                const effectiveTime = this.gameTime - fireOffset;
                if (effectiveTime >= 0) {
                    if (turret.lastShotTime < 0 || effectiveTime - turret.lastShotTime >= fireInterval) {
                        turret.lastShotTime = effectiveTime - (effectiveTime % fireInterval);
                        const speed = turret.config.projectileSpeed ?? 320;
                        const len = turret.config.projectileLength ?? 20;
                        projectiles.push({
                            id: `${turret.config.id}_${Date.now()}_${Math.random()}`,
                            x: nozzle.x,
                            y: nozzle.y,
                            vx: nozzle.dirX * speed,
                            vy: nozzle.dirY * speed,
                            width: len,
                            height: 6,
                            color: turret.themeColor,
                            turretId: turret.config.id,
                            life: 0,
                            maxLife: 4.0,
                            direction: turret.config.direction,
                            angle: nozzle.angle,
                        });
                        this.audio.playLaserShoot();
                        this.particles.emitLaserMuzzle(nozzle.x, nozzle.y, nozzle.dirX, nozzle.dirY, turret.themeColor);
                    }
                }
            }
        }
        // Integrate and collide in-flight projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life += dt;
            if (p.life >= p.maxLife || p.x < -20 || p.x > ScreenData_1.FACE_SIZE + 20 || p.y < -20 || p.y > ScreenData_1.FACE_SIZE + 20) {
                projectiles.splice(i, 1);
                continue;
            }
            // Check collision with solid tiles
            const checkX = p.x + Math.cos(p.angle) * p.width * 0.5;
            const checkY = p.y + Math.sin(p.angle) * p.width * 0.5;
            const tileR = Math.floor(checkY / ScreenData_1.TILE_SIZE);
            const tileC = Math.floor(checkX / ScreenData_1.TILE_SIZE);
            let hit = false;
            if (tileR >= 0 && tileR < room.tiles.length && tileC >= 0 && tileC < room.tiles[0].length) {
                const tile = room.tiles[tileR][tileC];
                if (tile === ScreenData_1.TileType.SOLID || tile === ScreenData_1.TileType.CRUMBLE) {
                    hit = true;
                    this.audio.playLaserImpact();
                    this.particles.emitLaserSparks(checkX, checkY, 8, p.color, -Math.sign(p.vx), -Math.sign(p.vy));
                    projectiles.splice(i, 1);
                    continue;
                }
            }
            // Check collision with moving platforms
            for (const plat of platforms) {
                if ((plat.x <= checkX && checkX <= plat.x + plat.width && plat.y <= checkY && checkY <= plat.y + plat.height) ||
                    (plat.x <= p.x && p.x <= plat.x + plat.width && plat.y <= p.y && p.y <= plat.y + plat.height)) {
                    hit = true;
                    this.audio.playLaserImpact();
                    this.particles.emitLaserSparks(checkX, checkY, 8, p.color, -Math.sign(p.vx), -Math.sign(p.vy));
                    projectiles.splice(i, 1);
                    break;
                }
            }
            if (hit)
                continue;
            // Check collision with player
            const tailX = p.x - Math.cos(p.angle) * p.width * 0.5;
            const tailY = p.y - Math.sin(p.angle) * p.width * 0.5;
            if (LaserBarrier_1.LaserBarrier.lineIntersectsBox(tailX, tailY, checkX, checkY, player.x, player.y, player.width, player.height, 4)) {
                projectiles.splice(i, 1);
                player.standingPlatform = null;
                this.audio.playDeath();
                this.particles.emitPlayerExplosion(player.x + player.width * 0.5, player.y + player.height * 0.5, player.primaryColor, p.color);
                if (onPlayerDeath)
                    onPlayerDeath();
                return true;
            }
        }
        return false;
    }
}
exports.PhysicsEngine = PhysicsEngine;
