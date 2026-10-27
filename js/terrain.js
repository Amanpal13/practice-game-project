/**
 * Procedural Terrain Engine for Hill Climb Racing
 * Supports multiple biomes (Countryside, Desert, Arctic, Moon),
 * dynamic props (trees, signs, bridges), coins, diamonds, and fuel cans.
 */

class TerrainSystem {
  constructor() {
    this.stageId = 'country';
    this.gravity = 9.8;
    this.friction = 1.0;
    this.seed = 42;

    // Items
    this.coins = [];
    this.fuelCans = [];
    this.markers = [];
    this.props = [];
    this.bridges = [];

    // Stage configs
    this.stages = {
      country: {
        name: 'Countryside',
        skyTop: '#4CA1AF',
        skyBottom: '#C4E0E5',
        grassColor: '#4CAF50',
        grassEdgeColor: '#76FF03',
        dirtTop: '#5D4037',
        dirtBottom: '#3E2723',
        gravity: 9.8,
        friction: 1.0,
        unlocked: true,
        cost: 0,
        skyElement: 'sun',
        bgMountainColor: '#3d6350',
        bgHillColor: '#538260'
      },
      desert: {
        name: 'Desert',
        skyTop: '#F3904F',
        skyBottom: '#3B4371',
        grassColor: '#EDC967',
        grassEdgeColor: '#FFE082',
        dirtTop: '#C79A42',
        dirtBottom: '#8D6E63',
        gravity: 9.8,
        friction: 0.88,
        unlocked: false,
        cost: 5000,
        skyElement: 'sun_hot',
        bgMountainColor: '#8C5A3C',
        bgHillColor: '#B87A4D'
      },
      arctic: {
        name: 'Arctic Snow',
        skyTop: '#1A2980',
        skyBottom: '#26D0CE',
        grassColor: '#E0F7FA',
        grassEdgeColor: '#FFFFFF',
        dirtTop: '#78909C',
        dirtBottom: '#455A64',
        gravity: 9.8,
        friction: 0.65,
        unlocked: false,
        cost: 15000,
        skyElement: 'aurora',
        bgMountainColor: '#37474F',
        bgHillColor: '#546E7A'
      },
      moon: {
        name: 'Moon',
        skyTop: '#05050A',
        skyBottom: '#1B1429',
        grassColor: '#B0BEC5',
        grassEdgeColor: '#ECEFF1',
        dirtTop: '#546E7A',
        dirtBottom: '#263238',
        gravity: 2.8, // Low floaty lunar gravity!
        friction: 0.9,
        unlocked: false,
        cost: 30000,
        skyElement: 'earth',
        bgMountainColor: '#1c1f24',
        bgHillColor: '#2d333b'
      }
    };

    // Load unlocked stages
    this.loadStageProgress();
  }

  loadStageProgress() {
    try {
      const saved = localStorage.getItem('hcr_stages');
      if (saved) {
        const data = JSON.parse(saved);
        for (const key in data) {
          if (this.stages[key]) {
            this.stages[key].unlocked = data[key].unlocked;
          }
        }
      }
    } catch (e) {
      console.warn("Failed loading stage progress:", e);
    }
  }

  saveStageProgress() {
    try {
      const data = {};
      for (const key in this.stages) {
        data[key] = { unlocked: this.stages[key].unlocked };
      }
      localStorage.setItem('hcr_stages', JSON.stringify(data));
    } catch (e) {
      console.warn("Failed saving stage progress:", e);
    }
  }

  unlockStage(stageId, playerCoins) {
    const stage = this.stages[stageId];
    if (!stage || stage.unlocked) return { success: false };
    if (playerCoins >= stage.cost) {
      stage.unlocked = true;
      this.saveStageProgress();
      return { success: true, remainingCoins: playerCoins - stage.cost };
    }
    return { success: false, needCoins: stage.cost - playerCoins };
  }

  setStage(stageId) {
    if (this.stages[stageId]) {
      this.stageId = stageId;
      const s = this.stages[stageId];
      this.gravity = s.gravity;
      this.friction = s.friction;
    }
    this.generateTrack();
  }

  /**
   * Reset and generate track entities up to 8000m
   */
  generateTrack(seed = 12345) {
    this.seed = seed;
    this.coins = [];
    this.fuelCans = [];
    this.markers = [];
    this.props = [];
    this.bridges = [];

    const currentBest = this.getBestRecord(this.stageId);

    // Place distance markers every 100 meters
    for (let m = 100; m <= 6000; m += 100) {
      const x = m * 20; // 20 pixels = 1 meter
      const y = this.getHeight(x);
      this.markers.push({
        x: x,
        y: y,
        meters: m,
        isBest: false
      });
    }

    // Place Best Record sign if exists
    if (currentBest > 50) {
      const bestX = currentBest * 20;
      this.markers.push({
        x: bestX,
        y: this.getHeight(bestX),
        meters: currentBest,
        isBest: true
      });
    }

    // Place Fuel Cans every ~120-160 meters
    for (let m = 90; m <= 6000; m += 130 + Math.floor(Math.sin(m) * 20)) {
      const x = m * 20;
      const y = this.getHeight(x) - 25;
      this.fuelCans.push({
        x: x,
        y: y,
        collected: false,
        size: 26,
        bobOffset: Math.random() * Math.PI * 2
      });
    }

    // Place Coin clusters and Diamonds
    for (let m = 20; m <= 6000; m += 25) {
      const x = m * 20;
      const isCrest = this.isHillCrest(x);

      // Arc of coins over hillcrests or jumps
      if (isCrest) {
        const count = 5 + Math.floor(Math.random() * 4);
        const arcWidth = 240;
        const arcHeight = 70 + Math.random() * 40;
        const isDiamondArc = Math.random() < 0.25;

        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          const cx = x - arcWidth * 0.5 + t * arcWidth;
          const groundY = this.getHeight(cx);
          // Parabolic jump arc
          const arcOffset = 4 * arcHeight * t * (1 - t) + 25;
          const cy = groundY - arcOffset;

          const coinType = isDiamondArc && i === Math.floor(count / 2) ? 'diamond' : (Math.random() < 0.3 ? 'silver' : 'gold');
          const value = coinType === 'diamond' ? 500 : (coinType === 'gold' ? 100 : 25);

          this.coins.push({
            x: cx,
            y: cy,
            type: coinType,
            value: value,
            collected: false,
            rotation: Math.random() * Math.PI,
            baseY: cy
          });
        }
      } else {
        // Ground-following coins
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const cx = x + i * 22;
          const cy = this.getHeight(cx) - 24;
          const coinType = Math.random() < 0.8 ? 'bronze' : 'silver';
          const value = coinType === 'silver' ? 25 : 5;

          this.coins.push({
            x: cx,
            y: cy,
            type: coinType,
            value: value,
            collected: false,
            rotation: Math.random() * Math.PI,
            baseY: cy
          });
        }
      }
    }

    // Place Scenery props
    for (let m = 30; m <= 6000; m += 35 + Math.floor(Math.abs(Math.sin(m * 9)) * 50)) {
      const x = m * 20;
      const y = this.getHeight(x);
      const slope = this.getSlope(x);

      // Don't place on extreme cliff faces
      if (Math.abs(slope) < 0.7) {
        let propType = 'tree';
        if (this.stageId === 'desert') propType = Math.random() < 0.7 ? 'cactus' : 'rock';
        else if (this.stageId === 'arctic') propType = Math.random() < 0.6 ? 'snowpine' : 'ice_crystal';
        else if (this.stageId === 'moon') propType = Math.random() < 0.6 ? 'crater_rock' : 'moon_flag';

        this.props.push({
          x: x,
          y: y,
          type: propType,
          scale: 0.8 + Math.random() * 0.4,
          flip: Math.random() > 0.5
        });
      }
    }
  }

  getBestRecord(stageId) {
    try {
      const records = JSON.parse(localStorage.getItem('hcr_records') || '{}');
      return records[stageId] || 0;
    } catch (e) {
      return 0;
    }
  }

  saveBestRecord(stageId, meters) {
    try {
      const records = JSON.parse(localStorage.getItem('hcr_records') || '{}');
      if (meters > (records[stageId] || 0)) {
        records[stageId] = meters;
        localStorage.setItem('hcr_records', JSON.stringify(records));
        return true;
      }
    } catch (e) {
      console.warn("Failed saving record:", e);
    }
    return false;
  }

  /**
   * Smooth, continuous terrain height function y = f(x)
   * Y values increase downwards in HTML5 Canvas.
   */
  getHeight(x) {
    if (x < -100) return 400;

    // Start with a gentle flat launchpad for the first 80m (1600px)
    if (x < 300) {
      const flat = 450;
      if (x < 150) return flat;
      const t = (x - 150) / 150;
      return flat - (1 - Math.cos(t * Math.PI)) * 0.5 * 30;
    }

    const m = x / 20; // Distance in meters

    // Base difficulty multiplier that gently scales up with distance
    const diff = Math.min(2.5, 0.8 + m / 1200);

    // Multi-octave harmonic landscape
    let y = 440;

    // Primary undulating rolling hills (wavelength ~400-800m)
    y += Math.sin(x * 0.0018) * 110 * diff;
    y += Math.cos(x * 0.0035 + 1.2) * 65 * diff;

    // Medium slopes and jumps (wavelength ~150-250m)
    y += Math.sin(x * 0.0078 + 0.5) * 45 * diff;
    y += Math.cos(x * 0.012 - 0.8) * 22;

    // Micro bumps & roughness
    y += Math.sin(x * 0.035) * 6;

    // Stage-specific modifications
    if (this.stageId === 'desert') {
      // Tall dune crests with steep slip faces
      const dune = Math.sin(x * 0.0022);
      y += (Math.exp(dune) - 1) * 70;
    } else if (this.stageId === 'arctic') {
      // Smooth swooping ramps
      y += Math.sin(x * 0.0015) * 90 * diff;
    } else if (this.stageId === 'moon') {
      // Low wide craters
      y += Math.sin(x * 0.001) * 130 + Math.cos(x * 0.004) * 50;
    }

    return y;
  }

  getSlope(x) {
    const dx = 2.0;
    return (this.getHeight(x + dx) - this.getHeight(x - dx)) / (2 * dx);
  }

  getNormal(x) {
    const slope = this.getSlope(x);
    // Slope = dy/dx. In canvas coordinates (+y down), surface normal pointing
    // UPWARDS into the air is (slope, -1) normalized.
    const len = Math.sqrt(1 + slope * slope);
    return {
      x: slope / len,
      y: -1.0 / len
    };
  }

  getTangent(x) {
    const slope = this.getSlope(x);
    // Forward tangent moving along +x direction is (1, slope) normalized.
    const len = Math.sqrt(1 + slope * slope);
    return {
      x: 1.0 / len,
      y: slope / len
    };
  }

  isHillCrest(x) {
    const s1 = this.getSlope(x - 20);
    const s2 = this.getSlope(x + 20);
    // In canvas coordinates, hill top has slope going from negative (upward) to positive (downward)
    return s1 < -0.15 && s2 > 0.15;
  }

  update(timeSec) {
    // Subtle coin rotation
    for (let i = 0; i < this.coins.length; i++) {
      this.coins[i].rotation += 0.04;
    }
  }

  // --- RENDERING ---

  /**
   * Render background layers (Sky, distant mountains, hills)
   */
  drawBackground(ctx, camera, width, height) {
    const stage = this.stages[this.stageId];

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, stage.skyTop);
    skyGrad.addColorStop(1, stage.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Celestion elements (Sun, Moon, Stars, Earth, Aurora)
    this.drawSkyElement(ctx, camera, width, height, stage.skyElement);

    // Parallax Layer 1: Distant mountains (0.1x camera scroll)
    this.drawParallaxHills(ctx, camera, width, height, 0.08, stage.bgMountainColor, 650, 220, 0.0006);

    // Parallax Layer 2: Mid-distance hills (0.25x camera scroll)
    this.drawParallaxHills(ctx, camera, width, height, 0.22, stage.bgHillColor, 520, 140, 0.0012);
  }

  drawSkyElement(ctx, camera, width, height, type) {
    ctx.save();
    if (type === 'sun' || type === 'sun_hot') {
      const sunX = width * 0.75 - (camera.x * 0.02) % (width * 1.5);
      const sunY = height * 0.22;
      const radius = type === 'sun_hot' ? 65 : 50;

      // Sun glow
      const glow = ctx.createRadialGradient(sunX, sunY, radius * 0.2, sunX, sunY, radius * 2.5);
      glow.addColorStop(0, 'rgba(255, 235, 120, 0.8)');
      glow.addColorStop(0.5, 'rgba(255, 180, 50, 0.2)');
      glow.addColorStop(1, 'rgba(255, 150, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Sun core
      ctx.fillStyle = type === 'sun_hot' ? '#FFF59D' : '#FFF9C4';
      ctx.beginPath();
      ctx.arc(sunX, sunY, radius, 0, Math.PI * 2);
      ctx.fill();

    } else if (type === 'earth') {
      // Moon stage: twinkling stars
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 70; i++) {
        const starX = (i * 137.5 + (camera.x * 0.005)) % width;
        const starY = (i * 93.7) % (height * 0.7);
        const starR = (i % 3 === 0) ? 2 : 1;
        ctx.globalAlpha = 0.4 + 0.6 * Math.sin(Date.now() * 0.003 + i);
        ctx.fillRect(starX, starY, starR, starR);
      }
      ctx.globalAlpha = 1.0;

      // Earth hanging in lunar sky
      const earthX = width * 0.7;
      const earthY = height * 0.25;
      const grad = ctx.createRadialGradient(earthX - 15, earthY - 15, 10, earthX, earthY, 70);
      grad.addColorStop(0, '#64B5F6');
      grad.addColorStop(0.6, '#1976D2');
      grad.addColorStop(1, '#0D47A1');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(earthX, earthY, 65, 0, Math.PI * 2);
      ctx.fill();

      // Atmosphere glow
      ctx.strokeStyle = 'rgba(100, 181, 246, 0.4)';
      ctx.lineWidth = 6;
      ctx.stroke();

    } else if (type === 'aurora') {
      // Northern lights ribbon
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        const t = Date.now() * 0.001 + j * 1.5;
        ctx.moveTo(0, height * 0.2 + Math.sin(t) * 20);
        for (let x = 0; x <= width; x += 60) {
          const y = height * 0.25 + Math.sin(x * 0.005 + t) * 45 + Math.cos(x * 0.01 + t * 0.7) * 25;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        const aGrad = ctx.createLinearGradient(0, 0, 0, height * 0.4);
        aGrad.addColorStop(0, 'rgba(0, 255, 180, 0.0)');
        aGrad.addColorStop(0.5, 'rgba(0, 255, 180, 0.2)');
        aGrad.addColorStop(1, 'rgba(100, 0, 255, 0.0)');
        ctx.fillStyle = aGrad;
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  drawParallaxHills(ctx, camera, width, height, scrollSpeed, color, baseY, hillAmp, freq) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();

    const startX = 0;
    const endX = width;
    const step = 20;

    ctx.moveTo(0, height);
    for (let sx = startX; sx <= endX; sx += step) {
      const worldX = (sx + camera.x * scrollSpeed);
      const hy = baseY + Math.sin(worldX * freq) * hillAmp + Math.cos(worldX * freq * 2.3) * (hillAmp * 0.4);
      // Map world Y relative to camera Y
      const screenY = hy - (camera.y - 450) * scrollSpeed * 0.5;
      ctx.lineTo(sx, screenY);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Render the foreground terrain surface and deep subterranean dirt
   */
  drawForeground(ctx, camera, viewLeft, viewRight, viewBottom) {
    const stage = this.stages[this.stageId];
    const step = 14; // Smooth segment step

    const startX = Math.floor(viewLeft / step) * step - step * 2;
    const endX = Math.ceil(viewRight / step) * step + step * 2;

    // --- 1. Draw Dirt Fill ---
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(startX, this.getHeight(startX));

    for (let x = startX; x <= endX; x += step) {
      ctx.lineTo(x, this.getHeight(x));
    }

    const deepBottom = Math.max(viewBottom + 250, 1600);
    ctx.lineTo(endX, deepBottom);
    ctx.lineTo(startX, deepBottom);
    ctx.closePath();

    // Deep soil gradient
    const dirtGrad = ctx.createLinearGradient(0, 250, 0, deepBottom);
    dirtGrad.addColorStop(0, stage.dirtTop);
    dirtGrad.addColorStop(1, stage.dirtBottom);
    ctx.fillStyle = dirtGrad;
    ctx.fill();

    // Underground rock strata lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 4;
    for (let layerY = 550; layerY < deepBottom; layerY += 120) {
      ctx.beginPath();
      for (let x = startX; x <= endX; x += step * 2) {
        const py = layerY + Math.sin(x * 0.01) * 15;
        if (x === startX) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();
    }

    // --- 2. Draw Top Grass / Surface Ribbon ---
    ctx.beginPath();
    ctx.moveTo(startX, this.getHeight(startX));
    for (let x = startX; x <= endX; x += step) {
      ctx.lineTo(x, this.getHeight(x));
    }
    // Grass ribbon width
    ctx.strokeStyle = stage.grassColor;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Grass highlighted upper trim line
    ctx.strokeStyle = stage.grassEdgeColor;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.restore();

    // --- 3. Draw Scenery Props ---
    this.drawProps(ctx, viewLeft, viewRight);

    // --- 4. Draw Distance Markers ---
    this.drawMarkers(ctx, viewLeft, viewRight);

    // --- 5. Draw Collectibles (Coins, Diamonds, Fuel Cans) ---
    this.drawCollectibles(ctx, viewLeft, viewRight);
  }

  drawProps(ctx, viewLeft, viewRight) {
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      if (p.x < viewLeft - 60 || p.x > viewRight + 60) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.flip ? -p.scale : p.scale, p.scale);

      if (p.type === 'tree') {
        // Pine tree
        ctx.fillStyle = '#4A2F1B';
        ctx.fillRect(-5, -15, 10, 18); // Trunk

        ctx.fillStyle = '#2E7D32';
        // 3 pine tiers
        for (let tier = 0; tier < 3; tier++) {
          const ty = -15 - tier * 18;
          const tw = 32 - tier * 6;
          ctx.beginPath();
          ctx.moveTo(-tw, ty);
          ctx.lineTo(0, ty - 26);
          ctx.lineTo(tw, ty);
          ctx.closePath();
          ctx.fill();
        }
      } else if (p.type === 'cactus') {
        // Desert Saguaro Cactus
        ctx.fillStyle = '#388E3C';
        // Main stem
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-7, -65, 14, 68, 6) : ctx.rect(-7, -65, 14, 68);
        ctx.fill();
        // Arms
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-24, -45, 18, 9, 4) : ctx.rect(-24, -45, 18, 9);
        ctx.roundRect ? ctx.roundRect(-24, -62, 9, 22, 4) : ctx.rect(-24, -62, 9, 22);
        ctx.roundRect ? ctx.roundRect(6, -35, 18, 9, 4) : ctx.rect(6, -35, 18, 9);
        ctx.roundRect ? ctx.roundRect(15, -50, 9, 20, 4) : ctx.rect(15, -50, 9, 20);
        ctx.fill();
      } else if (p.type === 'snowpine') {
        // Snow capped pine
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(-4, -14, 8, 16);
        ctx.fillStyle = '#1B5E20';
        for (let tier = 0; tier < 3; tier++) {
          const ty = -14 - tier * 16;
          const tw = 28 - tier * 6;
          ctx.beginPath();
          ctx.moveTo(-tw, ty);
          ctx.lineTo(0, ty - 24);
          ctx.lineTo(tw, ty);
          ctx.closePath();
          ctx.fill();

          // Snow cap on needles
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(-tw, ty);
          ctx.lineTo(-tw + 6, ty - 5);
          ctx.lineTo(0, ty - 24);
          ctx.lineTo(tw - 6, ty - 5);
          ctx.lineTo(tw, ty);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#1B5E20';
        }
      } else if (p.type === 'moon_flag') {
        // Lunar Apollo style flag
        ctx.strokeStyle = '#CFD8DC';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -55);
        ctx.lineTo(30, -55);
        ctx.stroke();

        ctx.fillStyle = '#FF5252';
        ctx.fillRect(0, -55, 30, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(15, -45, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Generic rock
        ctx.fillStyle = '#616161';
        ctx.beginPath();
        ctx.ellipse(0, -6, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawMarkers(ctx, viewLeft, viewRight) {
    for (let i = 0; i < this.markers.length; i++) {
      const m = this.markers[i];
      if (m.x < viewLeft - 60 || m.x > viewRight + 60) continue;

      ctx.save();
      ctx.translate(m.x, m.y);

      // Wooden Post
      ctx.fillStyle = m.isBest ? '#F57F17' : '#8D6E63';
      ctx.fillRect(-4, -50, 8, 52);

      // Signboard
      const signWidth = m.isBest ? 90 : 70;
      const signHeight = m.isBest ? 34 : 26;

      ctx.fillStyle = m.isBest ? '#FFD54F' : '#D7CCC8';
      ctx.strokeStyle = m.isBest ? '#FF6F00' : '#4E342E';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-signWidth / 2, -50 - signHeight, signWidth, signHeight, 5)
                    : ctx.rect(-signWidth / 2, -50 - signHeight, signWidth, signHeight);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = m.isBest ? '#B71C1C' : '#3E2723';
      ctx.font = `bold ${m.isBest ? 13 : 14}px 'Arial Black', Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = m.isBest ? `RECORD ${m.meters}m` : `${m.meters}m`;
      ctx.fillText(label, 0, -50 - signHeight * 0.5);

      ctx.restore();
    }
  }

  drawCollectibles(ctx, viewLeft, viewRight) {
    const time = Date.now() * 0.005;

    // --- Fuel Cans ---
    for (let i = 0; i < this.fuelCans.length; i++) {
      const f = this.fuelCans[i];
      if (f.collected || f.x < viewLeft - 40 || f.x > viewRight + 40) continue;

      ctx.save();
      const floatY = f.y + Math.sin(time + f.bobOffset) * 4;
      ctx.translate(f.x, floatY);

      // Red Jerry Can
      ctx.fillStyle = '#D32F2F';
      ctx.strokeStyle = '#B71C1C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-12, -18, 24, 30, 4) : ctx.rect(-12, -18, 24, 30);
      ctx.fill();
      ctx.stroke();

      // Top handle & spout
      ctx.fillStyle = '#9E9E9E';
      ctx.fillRect(-7, -24, 14, 6);
      ctx.fillStyle = '#F57C00';
      ctx.fillRect(5, -27, 6, 8);

      // "FUEL" stamp
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAS', 0, -2);

      // Pulsing glow circle
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -3, 20 + Math.sin(time * 2) * 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // --- Coins & Diamonds ---
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (c.collected || c.x < viewLeft - 30 || c.x > viewRight + 30) continue;

      ctx.save();
      const floatY = c.baseY + Math.sin(time * 1.5 + c.x * 0.1) * 3;
      ctx.translate(c.x, floatY);

      if (c.type === 'diamond') {
        // Red Diamond Gem
        ctx.fillStyle = '#FF1744';
        ctx.strokeStyle = '#FF8A80';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(12, -4);
        ctx.lineTo(0, 14);
        ctx.lineTo(-12, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Facet reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(6, -4);
        ctx.lineTo(0, 0);
        ctx.lineTo(-6, -4);
        ctx.closePath();
        ctx.fill();

      } else {
        // 3D Spinning Coin
        const widthScale = Math.abs(Math.cos(c.rotation));
        ctx.scale(Math.max(0.15, widthScale), 1);

        let coreColor = '#FFD700'; // Gold
        let edgeColor = '#FFA000';
        let valText = '$';

        if (c.type === 'silver') {
          coreColor = '#CFD8DC';
          edgeColor = '#90A4AE';
          valText = '25';
        } else if (c.type === 'bronze') {
          coreColor = '#D7CCC8';
          edgeColor = '#8D6E63';
          valText = '5';
        }

        ctx.fillStyle = coreColor;
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner coin ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();

        // Coin value or symbol
        ctx.fillStyle = edgeColor;
        ctx.font = 'bold 9px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(valText, 0, 0);
      }

      ctx.restore();
    }
  }
}

window.terrainSystem = new TerrainSystem();
