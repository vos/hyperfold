"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaserTurret = void 0;
const ScreenData_1 = require("../world/ScreenData");
const LaserBarrier_1 = require("./LaserBarrier");
class LaserTurret {
    config;
    lastShotTime = -999;
    themeColor;
    mode;
    // Beam mode state tracking
    beamState = 'INACTIVE';
    prevBeamState = 'INACTIVE';
    isBeamActive = false;
    beamChargeProgress = 0;
    constructor(config) {
        this.config = config;
        this.themeColor = config.themeColor ?? '#ff0055';
        this.mode = config.mode ?? 'projectile';
        if (this.mode === 'beam') {
            const initial = this.getBeamState(0);
            this.beamState = initial.state;
            this.prevBeamState = initial.state;
            this.isBeamActive = initial.isActive;
            this.beamChargeProgress = initial.chargeProgress;
        }
    }
    /**
     * Updates beam state for the current timestamp and tracks transitions.
     */
    updateBeam(time) {
        this.prevBeamState = this.beamState;
        const current = this.getBeamState(time);
        this.beamState = current.state;
        this.isBeamActive = current.isActive;
        this.beamChargeProgress = current.chargeProgress;
    }
    /**
     * Returns true if the beam transitioned into the WARNING state on this update.
     */
    justEnteredWarning() {
        return this.beamState === 'WARNING' && this.prevBeamState !== 'WARNING';
    }
    /**
     * Returns true if the beam transitioned into the ACTIVE lethal state on this update.
     */
    justActivated() {
        return this.beamState === 'ACTIVE' && this.prevBeamState !== 'ACTIVE';
    }
    /**
     * Resolves the turret firing angle in radians.
     */
    getFiringAngle() {
        if (this.config.angle !== undefined) {
            return (this.config.angle * Math.PI) / 180;
        }
        switch (this.config.direction) {
            case 'right': return 0;
            case 'down': return Math.PI * 0.5;
            case 'left': return Math.PI;
            case 'up': return -Math.PI * 0.5;
            default: return 0;
        }
    }
    getNozzlePosition() {
        const angle = this.getFiringAngle();
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        return {
            x: this.config.x + dirX * 16,
            y: this.config.y + dirY * 16,
            dirX,
            dirY,
            angle,
        };
    }
    /**
     * Evaluates beam state if turret is in 'beam' mode.
     */
    getBeamState(time) {
        const activeDur = Math.max(0.1, this.config.activeDuration ?? 2.0);
        const inactiveDur = Math.max(0.1, this.config.inactiveDuration ?? 2.0);
        const warnDur = Math.min(inactiveDur, Math.max(0, this.config.warningDuration ?? 0.6));
        const cycleDur = activeDur + inactiveDur;
        const phase = ((this.config.initialPhase ?? 0) * cycleDur) % cycleDur;
        let t = (time + phase) % cycleDur;
        if (t < 0)
            t += cycleDur;
        if (t < activeDur) {
            return { state: 'ACTIVE', isActive: true, chargeProgress: 1 };
        }
        else if (t < cycleDur - warnDur) {
            return { state: 'INACTIVE', isActive: false, chargeProgress: 0 };
        }
        else {
            const chargeProgress = warnDur > 0 ? (t - (cycleDur - warnDur)) / warnDur : 1;
            return { state: 'WARNING', isActive: false, chargeProgress: Math.min(1, Math.max(0, chargeProgress)) };
        }
    }
    /**
     * Casts a ray from (startX, startY) in any direction/angle across the room.
     * Finds the closest collision with solid tiles, moving platforms, or room boundaries.
     */
    static castRay(startX, startY, directionOrAngle, tiles, platforms = []) {
        let dirX = 1;
        let dirY = 0;
        if (typeof directionOrAngle === 'string') {
            switch (directionOrAngle) {
                case 'right':
                    dirX = 1;
                    dirY = 0;
                    break;
                case 'down':
                    dirX = 0;
                    dirY = 1;
                    break;
                case 'left':
                    dirX = -1;
                    dirY = 0;
                    break;
                case 'up':
                    dirX = 0;
                    dirY = -1;
                    break;
            }
        }
        else if (typeof directionOrAngle === 'number') {
            dirX = Math.cos(directionOrAngle);
            dirY = Math.sin(directionOrAngle);
        }
        else if (directionOrAngle && typeof directionOrAngle === 'object') {
            const len = Math.hypot(directionOrAngle.dirX, directionOrAngle.dirY) || 1;
            dirX = directionOrAngle.dirX / len;
            dirY = directionOrAngle.dirY / len;
        }
        // 1. Intersect Room Boundary [0, FACE_SIZE] x [0, FACE_SIZE]
        let boundaryDist = Infinity;
        let boundaryNormX = 0;
        let boundaryNormY = 0;
        if (dirX > 1e-6) {
            const d = (ScreenData_1.FACE_SIZE - startX) / dirX;
            if (d > 0 && d < boundaryDist) {
                boundaryDist = d;
                boundaryNormX = -1;
                boundaryNormY = 0;
            }
        }
        else if (dirX < -1e-6) {
            const d = -startX / dirX;
            if (d > 0 && d < boundaryDist) {
                boundaryDist = d;
                boundaryNormX = 1;
                boundaryNormY = 0;
            }
        }
        if (dirY > 1e-6) {
            const d = (ScreenData_1.FACE_SIZE - startY) / dirY;
            if (d > 0 && d < boundaryDist) {
                boundaryDist = d;
                boundaryNormX = 0;
                boundaryNormY = -1;
            }
        }
        else if (dirY < -1e-6) {
            const d = -startY / dirY;
            if (d > 0 && d < boundaryDist) {
                boundaryDist = d;
                boundaryNormX = 0;
                boundaryNormY = 1;
            }
        }
        // 2. Intersect Solid / Crumble Tiles using Grid DDA
        let tileDist = Infinity;
        let tileNormX = 0;
        let tileNormY = 0;
        let col = Math.floor(startX / ScreenData_1.TILE_SIZE);
        let row = Math.floor(startY / ScreenData_1.TILE_SIZE);
        const stepX = dirX > 0 ? 1 : dirX < 0 ? -1 : 0;
        const stepY = dirY > 0 ? 1 : dirY < 0 ? -1 : 0;
        const deltaDistX = Math.abs(dirX) > 1e-6 ? Math.abs(ScreenData_1.TILE_SIZE / dirX) : Infinity;
        const deltaDistY = Math.abs(dirY) > 1e-6 ? Math.abs(ScreenData_1.TILE_SIZE / dirY) : Infinity;
        let sideDistX = 0;
        let sideDistY = 0;
        if (stepX > 0) {
            sideDistX = ((col + 1) * ScreenData_1.TILE_SIZE - startX) / dirX;
        }
        else if (stepX < 0) {
            sideDistX = (col * ScreenData_1.TILE_SIZE - startX) / dirX;
        }
        else {
            sideDistX = Infinity;
        }
        if (stepY > 0) {
            sideDistY = ((row + 1) * ScreenData_1.TILE_SIZE - startY) / dirY;
        }
        else if (stepY < 0) {
            sideDistY = (row * ScreenData_1.TILE_SIZE - startY) / dirY;
        }
        else {
            sideDistY = Infinity;
        }
        let currentDist = 0;
        let lastNormX = 0;
        let lastNormY = 0;
        for (let step = 0; step < 80; step++) {
            if (col >= 0 && col < tiles[0].length && row >= 0 && row < tiles.length) {
                const t = tiles[row][col];
                if (step > 0 && (t === ScreenData_1.TileType.SOLID || t === ScreenData_1.TileType.CRUMBLE)) {
                    tileDist = currentDist;
                    tileNormX = lastNormX;
                    tileNormY = lastNormY;
                    break;
                }
            }
            else {
                break;
            }
            if (sideDistX < sideDistY) {
                currentDist = sideDistX;
                sideDistX += deltaDistX;
                col += stepX;
                lastNormX = -stepX;
                lastNormY = 0;
            }
            else {
                currentDist = sideDistY;
                sideDistY += deltaDistY;
                row += stepY;
                lastNormX = 0;
                lastNormY = -stepY;
            }
        }
        // 3. Intersect Moving Platforms (Slab method)
        let platformDist = Infinity;
        let hitPlatform;
        let platNormX = 0;
        let platNormY = 0;
        for (const plat of platforms) {
            let tmin = 0;
            let tmax = Math.min(tileDist, boundaryDist);
            let curNx = 0;
            let curNy = 0;
            let valid = true;
            if (Math.abs(dirX) > 1e-6) {
                let t1 = (plat.x - startX) / dirX;
                let t2 = (plat.x + plat.width - startX) / dirX;
                let nx = -Math.sign(dirX);
                if (t1 > t2) {
                    const tmp = t1;
                    t1 = t2;
                    t2 = tmp;
                    nx = Math.sign(dirX);
                }
                if (t1 > tmin) {
                    tmin = t1;
                    curNx = nx;
                    curNy = 0;
                }
                tmax = Math.min(tmax, t2);
            }
            else if (startX < plat.x || startX > plat.x + plat.width) {
                valid = false;
            }
            if (valid && Math.abs(dirY) > 1e-6) {
                let t1 = (plat.y - startY) / dirY;
                let t2 = (plat.y + plat.height - startY) / dirY;
                let ny = -Math.sign(dirY);
                if (t1 > t2) {
                    const tmp = t1;
                    t1 = t2;
                    t2 = tmp;
                    ny = Math.sign(dirY);
                }
                if (t1 > tmin) {
                    tmin = t1;
                    curNx = 0;
                    curNy = ny;
                }
                tmax = Math.min(tmax, t2);
            }
            else if (startY < plat.y || startY > plat.y + plat.height) {
                valid = false;
            }
            if (valid && tmax >= tmin && tmin > 0) {
                if (tmin < platformDist) {
                    platformDist = tmin;
                    hitPlatform = plat;
                    platNormX = curNx;
                    platNormY = curNy;
                }
            }
        }
        // 4. Resolve closest obstacle
        let hitType = 'boundary';
        let distance = boundaryDist;
        let normalX = boundaryNormX;
        let normalY = boundaryNormY;
        if (tileDist <= distance && tileDist <= platformDist) {
            distance = tileDist;
            hitType = 'wall';
            normalX = tileNormX;
            normalY = tileNormY;
        }
        else if (platformDist < distance && platformDist < tileDist) {
            distance = platformDist;
            hitType = 'platform';
            normalX = platNormX;
            normalY = platNormY;
        }
        const hitX = startX + dirX * distance;
        const hitY = startY + dirY * distance;
        return { hitX, hitY, distance, hitType, hitPlatform, normalX, normalY };
    }
    /**
     * Tests if a raycast beam intersects a player box.
     */
    static rayIntersectsPlayer(startX, startY, hitX, hitY, player, beamRadius = 4) {
        return LaserBarrier_1.LaserBarrier.lineIntersectsBox(startX, startY, hitX, hitY, player.x, player.y, player.width, player.height, beamRadius);
    }
}
exports.LaserTurret = LaserTurret;
