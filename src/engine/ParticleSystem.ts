export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  height?: number;
  color: string;
  shape: 'circle' | 'spark' | 'square';
}

export class ParticleSystem {
  private particles: Particle[] = [];

  public emitDust(x: number, y: number, count: number = 6, color: string = '#00ffff'): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8; // mostly upward
      const speed = 20 + Math.random() * 50;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
        size: 3 + Math.random() * 3,
        color,
        shape: 'circle',
      });
    }
  }

  public emitSparks(x: number, y: number, count: number = 16, color: string = '#ffe600'): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 2 + Math.random() * 3,
        color,
        shape: 'spark',
      });
    }
  }

  public emitTrail(x: number, y: number, width: number, height: number, color: string): void {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.15,
      maxLife: 0.15,
      size: width,
      height: height,
      color,
      shape: 'square',
    });
  }

  public emitAmbientMote(x: number, y: number, color: string): void {
    if (this.particles.length > 150) return;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 15,
      vy: -10 - Math.random() * 20,
      life: 0.8 + Math.random() * 0.6,
      maxLife: 1.4,
      size: 2 + Math.random() * 2,
      color,
      shape: 'circle',
    });
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt; // slight gravity for sparks/dust
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      const progress = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, progress));
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * progress, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'spark') {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      } else if (p.shape === 'square') {
        // Character ghost trail
        ctx.fillRect(p.x, p.y, p.size, p.height || p.size * 1.5);
      }
    }
    ctx.restore();
  }

  public clear(): void {
    this.particles = [];
  }
}
