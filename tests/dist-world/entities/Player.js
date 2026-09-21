"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
class Player {
    static STANDING_HEIGHT = 36;
    static DUCKING_HEIGHT = 18;
    STANDING_HEIGHT = 36;
    DUCKING_HEIGHT = 18;
    x = 120;
    y = 660;
    vx = 0;
    vy = 0;
    width = 24;
    height = 36;
    isGrounded = false;
    wasGrounded = false;
    isBouncePropelled = false;
    isDucking = false;
    standingPlatform = null;
    facing = 1; // 1 = right, -1 = left
    // Kinematics tuning constants
    MOVE_SPEED = 280;
    CRAWL_SPEED = 140;
    ACCELERATION = 1800;
    DECELERATION = 2000;
    GRAVITY = 1150;
    JUMP_VELOCITY = -520;
    MIN_JUMP_VELOCITY = -200;
    MAX_FALL_SPEED = 650;
    // Forgiving platformer timers (seconds)
    coyoteTime = 0;
    COYOTE_DURATION = 0.1;
    jumpBufferTime = 0;
    JUMP_BUFFER_DURATION = 0.12;
    dropThroughTimer = 0;
    // Visuals & animation
    animTimer = 0;
    trailTimer = 0;
    primaryColor = '#00ffff';
    accentColor = '#ff007f';
    isAlive = true;
    resetHoldProgress = 0;
    constructor(startX = 120, startY = 660) {
        this.x = startX;
        this.y = startY;
    }
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }
    setDucking(ducking) {
        if (this.isDucking === ducking) return;
        this.isDucking = ducking;
        const prevHeight = this.height;
        this.height = ducking ? this.DUCKING_HEIGHT : this.STANDING_HEIGHT;
        // Anchor feet: adjust y so (y + height) remains constant
        this.y += (prevHeight - this.height);
    }
    updateTimers(dt) {
        if (this.isGrounded) {
            this.coyoteTime = this.COYOTE_DURATION;
        }
        else {
            this.coyoteTime = Math.max(0, this.coyoteTime - dt);
        }
        if (this.jumpBufferTime > 0) {
            this.jumpBufferTime = Math.max(0, this.jumpBufferTime - dt);
        }
        if (this.dropThroughTimer > 0) {
            this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);
        }
        this.animTimer += dt * 10;
    }
    render(ctx, particles) {
        if (!this.isAlive)
            return;
        ctx.save();
        // Subtle breathing/bounce scaling
        const bounce = this.isGrounded && Math.abs(this.vx) > 10 ? Math.sin(this.animTimer * 1.5) * 2 : 0;
        const px = Math.floor(this.x);
        const py = Math.floor(this.y) + bounce;
        const w = this.width;
        const h = this.height - bounce;
        // Motion trail when moving fast
        if (particles && Math.abs(this.vx) > 150) {
            this.trailTimer += 0.016;
            if (this.trailTimer > 0.06) {
                this.trailTimer = 0;
                particles.emitTrail(px, py, w, h, 'rgba(0, 255, 255, 0.25)');
            }
        }
        // Outer Neon Glow
        ctx.shadowColor = this.primaryColor;
        ctx.shadowBlur = 10;
        // Body chassis (rounded futuristic rectangle)
        ctx.fillStyle = '#0a101d';
        ctx.strokeStyle = this.primaryColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(px, py, w, h, Math.min(6, Math.floor(h * 0.35)));
        ctx.fill();
        ctx.stroke();
        // Glowing Neon Visor / Eye
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        const visorW = 10;
        const visorH = this.isDucking ? 3 : 4;
        const visorX = this.facing === 1 ? px + w - 12 : px + 2;
        const visorY = this.isDucking ? py + 3 : py + 7;
        ctx.fillRect(visorX, visorY, visorW, visorH);
        // Glowing Core Reactor (Chest)
        ctx.fillStyle = this.accentColor;
        ctx.shadowColor = this.accentColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        const coreRadius = this.isDucking ? 2.5 : 4;
        ctx.arc(px + w * 0.5, py + h * 0.55, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        // Animated Runner / Ducking Legs
        ctx.shadowBlur = 4;
        ctx.strokeStyle = this.primaryColor;
        ctx.lineWidth = this.isDucking ? 2.5 : 3;
        const legY = py + h - 2;
        if (this.isDucking) {
            // Ducking legs: tucked/crouched stance or crawling motion
            if (Math.abs(this.vx) > 10) {
                const crawl = Math.sin(this.animTimer * 2) * 3;
                ctx.beginPath();
                ctx.moveTo(px + w * 0.25, legY);
                ctx.lineTo(px + w * 0.4 + crawl, legY + 2);
                ctx.moveTo(px + w * 0.75, legY);
                ctx.lineTo(px + w * 0.6 - crawl, legY + 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(px + w * 0.25, legY);
                ctx.lineTo(px + w * 0.4, legY + 2);
                ctx.moveTo(px + w * 0.75, legY);
                ctx.lineTo(px + w * 0.6, legY + 2);
                ctx.stroke();
            }
        }
        else if (this.isGrounded && Math.abs(this.vx) > 20) {
            const stride = Math.sin(this.animTimer * 1.5) * 5;
            // Front leg
            ctx.beginPath();
            ctx.moveTo(px + w * 0.3, legY);
            ctx.lineTo(px + w * 0.3 + stride, legY + 4);
            ctx.stroke();
            // Back leg
            ctx.beginPath();
            ctx.moveTo(px + w * 0.7, legY);
            ctx.lineTo(px + w * 0.7 - stride, legY + 4);
            ctx.stroke();
        }
        else if (!this.isGrounded) {
            // In-air tucked legs
            ctx.beginPath();
            ctx.moveTo(px + w * 0.3, legY);
            ctx.lineTo(px + w * 0.2, legY + 2);
            ctx.moveTo(px + w * 0.7, legY);
            ctx.lineTo(px + w * 0.8, legY + 2);
            ctx.stroke();
        }
        else {
            // Idle legs
            ctx.beginPath();
            ctx.moveTo(px + w * 0.3, legY);
            ctx.lineTo(px + w * 0.3, legY + 3);
            ctx.moveTo(px + w * 0.7, legY);
            ctx.lineTo(px + w * 0.7, legY + 3);
            ctx.stroke();
        }
        // Radial hold-to-restart gauge around player
        if (this.resetHoldProgress > 0) {
            const centerX = px + w * 0.5;
            const centerY = py + h * 0.5;
            const radius = 26;
            const progress = Math.min(1, Math.max(0, this.resetHoldProgress));
            // Background track ring
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 3.5;
            ctx.stroke();
            // Foreground charging arc
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, -Math.PI * 0.5, -Math.PI * 0.5 + progress * Math.PI * 2);
            ctx.strokeStyle = progress >= 1 ? '#00ffff' : '#ffe600';
            ctx.lineWidth = 4;
            ctx.shadowColor = progress >= 1 ? '#00ffff' : '#ffe600';
            ctx.shadowBlur = 12;
            ctx.stroke();
            // Inner pulsating core
            ctx.beginPath();
            ctx.arc(centerX, centerY, 3 + progress * 5, 0, Math.PI * 2);
            ctx.fillStyle = progress >= 1 ? '#ffffff' : '#ffe600';
            ctx.shadowBlur = 8;
            ctx.fill();
        }
        ctx.restore();
    }
}
exports.Player = Player;
