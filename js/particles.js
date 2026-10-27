/**
 * Particle and Floating Text System
 * Handles tire kick-up, exhaust smoke, coin sparks, and stunt notifications
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
  }

  reset() {
    this.particles = [];
    this.floatingTexts = [];
  }

  /**
   * Spawn exhaust puff from vehicle tailpipe
   */
  emitExhaust(x, y, angle, velocityX, velocityY, intensity = 1.0) {
    // Offset slightly opposite to heading
    const count = Math.random() < intensity ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.4;
      const speed = 2 + Math.random() * 4;
      const dir = angle + Math.PI + spread;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(dir) * speed + velocityX * 0.2,
        vy: Math.sin(dir) * speed + velocityY * 0.2 - 0.8,
        radius: 3 + Math.random() * 4,
        maxRadius: 16 + Math.random() * 10,
        color: 'rgba(210, 210, 210, ',
        alpha: 0.6 + Math.random() * 0.3,
        life: 0,
        maxLife: 25 + Math.random() * 20,
        type: 'smoke'
      });
    }
  }

  /**
   * Spawn tire kick-up dirt/sand/snow/sparks
   */
  emitTireSpray(x, y, normalX, normalY, wheelSpeed, surfaceType = 'country') {
    const count = 2 + Math.floor(Math.random() * 3);
    let baseColor = 'rgba(120, 80, 45, '; // Dirt
    if (surfaceType === 'desert') baseColor = 'rgba(224, 185, 110, ';
    else if (surfaceType === 'arctic') baseColor = 'rgba(240, 245, 255, ';
    else if (surfaceType === 'moon') baseColor = 'rgba(180, 180, 195, ';

    for (let i = 0; i < count; i++) {
      // Spray opposite to wheel spin direction
      const sprayDir = Math.atan2(normalY, normalX) + Math.PI * 0.5 + (Math.random() - 0.5) * 0.8;
      const speed = (2 + Math.random() * 6) * (Math.abs(wheelSpeed) > 10 ? 1.5 : 1);

      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y - 2,
        vx: Math.cos(sprayDir) * speed * Math.sign(wheelSpeed || 1) * -1,
        vy: -Math.random() * 4 - 2,
        radius: 2 + Math.random() * 3,
        maxRadius: 2 + Math.random() * 2,
        color: baseColor,
        alpha: 0.8,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        type: 'dirt'
      });
    }
  }

  /**
   * Sparkle burst when collecting coins or diamonds
   */
  emitCoinSparkles(x, y, color = '#FFD700') {
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + (Math.random() - 0.5) * 0.3;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.5 + Math.random() * 2.5,
        maxRadius: 1,
        color: color,
        alpha: 1.0,
        life: 0,
        maxLife: 25 + Math.random() * 10,
        type: 'spark'
      });
    }
  }

  /**
   * Crash debris & sparks
   */
  emitCrashDebris(x, y) {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 10;
      const isMetal = Math.random() > 0.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        radius: isMetal ? 3 + Math.random() * 4 : 2,
        color: isMetal ? '#E74C3C' : '#F39C12',
        alpha: 1.0,
        life: 0,
        maxLife: 40 + Math.random() * 30,
        type: 'debris',
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3
      });
    }
  }

  /**
   * Floating notification text (+100, BACKFLIP!, AIR TIME!)
   */
  addFloatingText(text, x, y, color = '#FFD700', size = 22, bold = true) {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      vy: -2.2,
      alpha: 1.0,
      scale: 1.4,
      targetScale: 1.0,
      color: color,
      size: size,
      bold: bold,
      life: 0,
      maxLife: 60
    });
  }

  update(dt = 1) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'smoke') {
        p.radius += (p.maxRadius - p.radius) * 0.05 * dt;
        p.alpha = (1 - p.life / p.maxLife) * 0.6;
        p.vy -= 0.03 * dt; // Rises slowly
      } else if (p.type === 'dirt') {
        p.vy += 0.3 * dt; // Gravity
        p.alpha = (1 - p.life / p.maxLife) * 0.8;
      } else if (p.type === 'spark') {
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.alpha = 1 - p.life / p.maxLife;
      } else if (p.type === 'debris') {
        p.vy += 0.4 * dt;
        p.vx *= 0.98;
        if (p.rot !== undefined) p.rot += p.rotSpeed;
        p.alpha = Math.max(0, 1 - (p.life / p.maxLife));
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ft.y += ft.vy * dt;
      ft.vy *= 0.96;
      if (ft.scale > ft.targetScale) {
        ft.scale -= 0.04 * dt;
      }
      if (ft.life > ft.maxLife * 0.6) {
        ft.alpha = 1 - (ft.life - ft.maxLife * 0.6) / (ft.maxLife * 0.4);
      }
    }
  }

  draw(ctx) {
    // Draw particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.save();
      if (p.type === 'smoke' || p.type === 'dirt') {
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'debris') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
      }
      ctx.restore();
    }

    // Draw floating texts
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const ft = this.floatingTexts[i];
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(ft.scale, ft.scale);

      ctx.font = `${ft.bold ? '900' : 'bold'} ${ft.size}px 'Arial Black', Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(ft.text, 0, 0);

      // Fill
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);

      ctx.restore();
    }
  }
}

window.particleSystem = new ParticleSystem();
