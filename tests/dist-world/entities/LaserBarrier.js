"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaserBarrier = void 0;
class LaserBarrier {
    config;
    state;
    prevState = 'INACTIVE';
    wasActive = false;
    themeColor;
    width;
    constructor(config, initialTime = 0) {
        this.config = config;
        this.themeColor = config.themeColor ?? '#ff0055';
        this.width = config.width ?? 4;
        this.state = LaserBarrier.computeBarrierState(config, initialTime);
        this.prevState = this.state.state;
        this.wasActive = this.state.isActive;
    }
    update(time) {
        this.prevState = this.state.state;
        this.wasActive = this.state.isActive;
        this.state = LaserBarrier.computeBarrierState(this.config, time);
    }
    /**
     * Returns true if the barrier just entered the WARNING state on this update.
     */
    justEnteredWarning() {
        return this.state.state === 'WARNING' && this.prevState !== 'WARNING';
    }
    /**
     * Returns true if the barrier just activated (became lethal) on this update.
     */
    justActivated() {
        return this.state.isActive && !this.wasActive;
    }
    /**
     * Deterministically calculates the barrier's endpoints, state, and progress at any time.
     */
    static computeBarrierState(config, time) {
        const { startX1, startY1, startX2, startY2 } = config;
        const endX1 = config.endX1 ?? startX1;
        const endY1 = config.endY1 ?? startY1;
        const endX2 = config.endX2 ?? startX2;
        const endY2 = config.endY2 ?? startY2;
        // 1. Movement Kinematics
        let p = 0;
        const dist1 = Math.hypot(endX1 - startX1, endY1 - startY1);
        const dist2 = Math.hypot(endX2 - startX2, endY2 - startY2);
        const maxDist = Math.max(dist1, dist2);
        if (config.speed && config.speed > 0 && maxDist > 0.001) {
            const moveDuration = maxDist / config.speed;
            const pauseDuration = Math.max(0, config.pauseTime ?? 0.4);
            const halfCycle = moveDuration + pauseDuration;
            const fullCycle = halfCycle * 2;
            const phase = ((config.initialProgress ?? 0) * fullCycle) % fullCycle;
            let t = (time + phase) % fullCycle;
            if (t < 0)
                t += fullCycle;
            if (t < moveDuration) {
                // Forward transit
                const s = t / moveDuration;
                p = 0.5 * (1 - Math.cos(Math.PI * s));
            }
            else if (t < halfCycle) {
                // Paused at destination
                p = 1;
            }
            else if (t < halfCycle + moveDuration) {
                // Return transit
                const s = (t - halfCycle) / moveDuration;
                p = 1 - 0.5 * (1 - Math.cos(Math.PI * s));
            }
            else {
                // Paused at start
                p = 0;
            }
        }
        const curX1 = startX1 + (endX1 - startX1) * p;
        const curY1 = startY1 + (endY1 - startY1) * p;
        const curX2 = startX2 + (endX2 - startX2) * p;
        const curY2 = startY2 + (endY2 - startY2) * p;
        // 2. Timing Cycle
        const activeDur = Math.max(0.1, config.activeDuration);
        const inactiveDur = Math.max(0.1, config.inactiveDuration);
        const warnDur = Math.min(inactiveDur, Math.max(0, config.warningDuration ?? 0.6));
        const cycleDur = activeDur + inactiveDur;
        const cyclePhase = ((config.initialPhase ?? 0) * cycleDur) % cycleDur;
        let cycleT = (time + cyclePhase) % cycleDur;
        if (cycleT < 0)
            cycleT += cycleDur;
        let state = 'INACTIVE';
        let isActive = false;
        let chargeProgress = 0;
        if (cycleT < activeDur) {
            state = 'ACTIVE';
            isActive = true;
            chargeProgress = 1;
        }
        else if (cycleT < cycleDur - warnDur) {
            state = 'INACTIVE';
            isActive = false;
            chargeProgress = 0;
        }
        else {
            state = 'WARNING';
            isActive = false;
            chargeProgress = warnDur > 0 ? (cycleT - (cycleDur - warnDur)) / warnDur : 1;
        }
        return {
            x1: curX1,
            y1: curY1,
            x2: curX2,
            y2: curY2,
            state,
            isActive,
            progress: p,
            chargeProgress: Math.min(1, Math.max(0, chargeProgress)),
        };
    }
    /**
     * Tests if the laser beam intersects the player's bounding box.
     */
    intersectsPlayer(player) {
        if (!this.state.isActive)
            return false;
        return LaserBarrier.lineIntersectsBox(this.state.x1, this.state.y1, this.state.x2, this.state.y2, player.x, player.y, player.width, player.height, (this.width || 4) * 0.5);
    }
    /**
     * Helper to check if a 2D line segment (with optional thickness) intersects an AABB.
     */
    static lineIntersectsBox(x1, y1, x2, y2, boxX, boxY, boxW, boxH, radius = 0) {
        // Expand box by radius
        const minX = boxX - radius;
        const maxX = boxX + boxW + radius;
        const minY = boxY - radius;
        const maxY = boxY + boxH + radius;
        // Check if either endpoint is inside the expanded box
        if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY)
            return true;
        if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY)
            return true;
        // Check bounding box overlap of the line segment with the target box
        const segMinX = Math.min(x1, x2);
        const segMaxX = Math.max(x1, x2);
        const segMinY = Math.min(y1, y2);
        const segMaxY = Math.max(y1, y2);
        if (segMaxX < minX || segMinX > maxX || segMaxY < minY || segMinY > maxY) {
            return false;
        }
        // Check intersection with all 4 rectangle edges
        return (LaserBarrier.segmentsIntersect(x1, y1, x2, y2, minX, minY, maxX, minY) || // Top
            LaserBarrier.segmentsIntersect(x1, y1, x2, y2, minX, maxY, maxX, maxY) || // Bottom
            LaserBarrier.segmentsIntersect(x1, y1, x2, y2, minX, minY, minX, maxY) || // Left
            LaserBarrier.segmentsIntersect(x1, y1, x2, y2, maxX, minY, maxX, maxY) // Right
        );
    }
    static segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        const ccw = (ax, ay, bx, by, cx, cy) => {
            return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
        };
        return (ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
            ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4));
    }
}
exports.LaserBarrier = LaserBarrier;
