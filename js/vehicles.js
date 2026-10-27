/**
 * Vehicle Definitions, Visual Renderers, and Upgrade Specifications
 */

class VehicleManager {
  constructor() {
    this.selectedVehicleId = 'jeep';

    // Vehicles Catalog
    this.vehicles = {
      jeep: {
        id: 'jeep',
        name: 'Hill Climber',
        unlocked: true,
        cost: 0,
        mass: 1.0,
        width: 82,
        height: 38,
        wheelRadius: 15.5,
        rearWheelOffset: { x: -30, y: 16 },
        frontWheelOffset: { x: 30, y: 16 },
        springRestLength: 22,
        springStiffness: 170.0,
        springDamping: 16.0,
        headOffset: { x: -8, y: -26 },
        exhaustOffset: { x: -44, y: 18 },
        baseTorque: 1450.0,
        baseFriction: 1.5,
        baseSpeed: 750.0,
        isBike: false,
        upgrades: {
          engine: 1,
          suspension: 1,
          tires: 1,
          fourWheelDrive: 1
        }
      },
      monster: {
        id: 'monster',
        name: 'Monster Truck',
        unlocked: false,
        cost: 8000,
        mass: 1.35,
        width: 96,
        height: 44,
        wheelRadius: 24,
        rearWheelOffset: { x: -38, y: 22 },
        frontWheelOffset: { x: 38, y: 22 },
        springRestLength: 32,
        springStiffness: 240.0,
        springDamping: 22.0,
        headOffset: { x: -4, y: -30 },
        exhaustOffset: { x: -50, y: 14 },
        baseTorque: 2200.0,
        baseFriction: 1.6,
        baseSpeed: 720.0,
        isBike: false,
        upgrades: {
          engine: 1,
          suspension: 1,
          tires: 1,
          fourWheelDrive: 1
        }
      },
      buggy: {
        id: 'buggy',
        name: 'Dune Buggy',
        unlocked: false,
        cost: 20000,
        mass: 0.82,
        width: 88,
        height: 32,
        wheelRadius: 16.5,
        rearWheelOffset: { x: -34, y: 14 },
        frontWheelOffset: { x: 34, y: 14 },
        springRestLength: 24,
        springStiffness: 150.0,
        springDamping: 14.0,
        headOffset: { x: -10, y: -20 },
        exhaustOffset: { x: -46, y: 8 },
        baseTorque: 1650.0,
        baseFriction: 1.55,
        baseSpeed: 880.0,
        isBike: false,
        upgrades: {
          engine: 1,
          suspension: 1,
          tires: 1,
          fourWheelDrive: 1
        }
      },
      bike: {
        id: 'bike',
        name: 'Motocross Bike',
        unlocked: false,
        cost: 35000,
        mass: 0.62,
        width: 70,
        height: 30,
        wheelRadius: 15,
        rearWheelOffset: { x: -28, y: 14 },
        frontWheelOffset: { x: 28, y: 14 },
        springRestLength: 20,
        springStiffness: 130.0,
        springDamping: 12.0,
        headOffset: { x: -4, y: -28 },
        exhaustOffset: { x: -34, y: 10 },
        baseTorque: 1350.0,
        baseFriction: 1.65,
        baseSpeed: 920.0,
        isBike: true,
        upgrades: {
          engine: 1,
          suspension: 1,
          tires: 1,
          fourWheelDrive: 1
        }
      }
    };

    this.maxUpgradeLevel = 10;
    this.loadVehicleData();
  }

  loadVehicleData() {
    try {
      const saved = localStorage.getItem('hcr_vehicles');
      if (saved) {
        const data = JSON.parse(saved);
        for (const vid in data) {
          if (this.vehicles[vid]) {
            this.vehicles[vid].unlocked = data[vid].unlocked;
            if (data[vid].upgrades) {
              this.vehicles[vid].upgrades = Object.assign(this.vehicles[vid].upgrades, data[vid].upgrades);
            }
          }
        }
      }
      const sel = localStorage.getItem('hcr_selected_vehicle');
      if (sel && this.vehicles[sel] && this.vehicles[sel].unlocked) {
        this.selectedVehicleId = sel;
      }
    } catch (e) {
      console.warn("Failed loading vehicle upgrades:", e);
    }
  }

  saveVehicleData() {
    try {
      const data = {};
      for (const vid in this.vehicles) {
        data[vid] = {
          unlocked: this.vehicles[vid].unlocked,
          upgrades: this.vehicles[vid].upgrades
        };
      }
      localStorage.setItem('hcr_vehicles', JSON.stringify(data));
      localStorage.setItem('hcr_selected_vehicle', this.selectedVehicleId);
    } catch (e) {
      console.warn("Failed saving vehicle data:", e);
    }
  }

  getCurrentVehicle() {
    return this.vehicles[this.selectedVehicleId] || this.vehicles.jeep;
  }

  selectVehicle(vehicleId) {
    if (this.vehicles[vehicleId] && this.vehicles[vehicleId].unlocked) {
      this.selectedVehicleId = vehicleId;
      this.saveVehicleData();
      return true;
    }
    return false;
  }

  unlockVehicle(vehicleId, playerCoins) {
    const v = this.vehicles[vehicleId];
    if (!v || v.unlocked) return { success: false };
    if (playerCoins >= v.cost) {
      v.unlocked = true;
      this.selectedVehicleId = vehicleId;
      this.saveVehicleData();
      return { success: true, remainingCoins: playerCoins - v.cost };
    }
    return { success: false, needCoins: v.cost - playerCoins };
  }

  getUpgradeCost(vehicleId, upgradeType) {
    const v = this.vehicles[vehicleId];
    if (!v) return 999999;
    const currentLvl = v.upgrades[upgradeType] || 1;
    if (currentLvl >= this.maxUpgradeLevel) return null; // Maxed out

    // Quadratic price scaling
    const basePrices = {
      engine: 180,
      suspension: 140,
      tires: 160,
      fourWheelDrive: 200
    };
    const base = basePrices[upgradeType] || 150;
    return Math.floor(base * Math.pow(currentLvl, 1.65));
  }

  upgradePart(vehicleId, upgradeType, playerCoins) {
    const v = this.vehicles[vehicleId];
    if (!v) return { success: false };
    const cost = this.getUpgradeCost(vehicleId, upgradeType);
    if (cost === null) return { success: false, maxed: true };

    if (playerCoins >= cost) {
      v.upgrades[upgradeType] = (v.upgrades[upgradeType] || 1) + 1;
      this.saveVehicleData();
      return {
        success: true,
        remainingCoins: playerCoins - cost,
        newLevel: v.upgrades[upgradeType]
      };
    }
    return { success: false, needCoins: cost - playerCoins };
  }

  // --- Vehicle Visual Drawing ---
  drawVehicleBody(ctx, vehicleDef, isHeadBroken, neckAngle = 0) {
    ctx.save();

    if (vehicleDef.id === 'jeep') {
      this.drawJeep(ctx, isHeadBroken, neckAngle);
    } else if (vehicleDef.id === 'monster') {
      this.drawMonster(ctx, isHeadBroken, neckAngle);
    } else if (vehicleDef.id === 'buggy') {
      this.drawBuggy(ctx, isHeadBroken, neckAngle);
    } else if (vehicleDef.id === 'bike') {
      this.drawBike(ctx, isHeadBroken, neckAngle);
    }

    ctx.restore();
  }

  // Draw coiled spring shock absorber
  drawSpring(ctx, x1, y1, x2, y2, springColor = '#ECEFF1') {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);

    // Inner damper rod
    ctx.strokeStyle = '#90A4AE';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dist, 0);
    ctx.stroke();

    // Damper cylinder sleeve
    ctx.fillStyle = '#37474F';
    ctx.fillRect(0, -5, dist * 0.45, 10);

    // Coiled Spring
    ctx.strokeStyle = springColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const coils = 5;
    const coilW = 8;
    const startOffset = dist * 0.2;
    const coilLen = dist * 0.65;
    const step = coilLen / coils;

    ctx.beginPath();
    ctx.moveTo(startOffset, 0);
    for (let i = 0; i < coils; i++) {
      const cx = startOffset + (i + 0.25) * step;
      const cy = (i % 2 === 0 ? -1 : 1) * coilW;
      ctx.lineTo(cx, cy);
      ctx.lineTo(startOffset + (i + 0.75) * step, -cy);
    }
    ctx.lineTo(startOffset + coilLen, 0);
    ctx.stroke();

    ctx.restore();
  }

  // Draw detailed wheel with tire tread, rim, and lug nuts
  drawWheel(ctx, x, y, radius, angle, isRimSpoke = true) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Outer rubber tire
    ctx.fillStyle = '#212121';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tire Treads
    ctx.fillStyle = '#111111';
    const treadCount = 12;
    for (let i = 0; i < treadCount; i++) {
      const th = (Math.PI * 2 * i) / treadCount;
      const tx = Math.cos(th) * (radius - 2);
      const ty = Math.sin(th) * (radius - 2);
      ctx.beginPath();
      ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner rim
    const rimR = radius * 0.62;
    ctx.fillStyle = '#CFD8DC';
    ctx.strokeStyle = '#90A4AE';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, rimR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rim spokes (5-star alloy)
    ctx.strokeStyle = '#546E7A';
    ctx.lineWidth = 2.8;
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (rimR - 2), Math.sin(a) * (rimR - 2));
      ctx.stroke();
    }

    // Center hub cap & lug nuts
    ctx.fillStyle = '#37474F';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- Driver Character with Bobbing Head ---
  drawDriver(ctx, x, y, isHeadBroken, neckAngle = 0) {
    ctx.save();
    ctx.translate(x, y);

    // Torso / racing jacket
    ctx.fillStyle = '#1565C0'; // Blue racing jacket
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-8, -4, 16, 20, 4) : ctx.rect(-8, -4, 16, 20);
    ctx.fill();

    // Racing stripe on chest
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-2, -4, 4, 20);

    // Arms holding steering wheel
    ctx.strokeStyle = '#1565C0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(3, 4);
    ctx.lineTo(16, 2);
    ctx.stroke();

    // Driver's Head & Helmet
    ctx.save();
    ctx.translate(0, -6);
    // Neck snapping rotation if crashed or accelerating
    ctx.rotate(isHeadBroken ? Math.PI * 0.65 : neckAngle);

    // Helmet (Hill Climb iconic red/white helmet)
    ctx.fillStyle = '#D32F2F';
    ctx.beginPath();
    ctx.arc(0, -7, 10.5, 0, Math.PI * 2);
    ctx.fill();

    // Helmet visor / face shield
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(1, -11, 10, 8, 3) : ctx.rect(1, -11, 10, 8);
    ctx.fill();

    // Helmet shine reflection
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-2, -9, 7, -Math.PI * 0.7, -Math.PI * 0.2);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // --- Specific Vehicle Visuals ---

  drawJeep(ctx, isHeadBroken, neckAngle) {
    // 1. Driver in cockpit
    this.drawDriver(ctx, -6, -8, isHeadBroken, neckAngle);

    // 2. Roll Cage bars
    ctx.strokeStyle = '#37474F';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-32, -4);
    ctx.lineTo(-24, -30);
    ctx.lineTo(8, -30);
    ctx.lineTo(18, -4);
    ctx.stroke();

    // Cross bar
    ctx.beginPath();
    ctx.moveTo(-10, -30);
    ctx.lineTo(-10, -4);
    ctx.stroke();

    // Steering wheel
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, 2);
    ctx.lineTo(13, -10);
    ctx.stroke();

    // 3. Main Red Body Shell
    ctx.fillStyle = '#E53935';
    ctx.strokeStyle = '#B71C1C';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-42, 14);
    ctx.lineTo(-42, -4);
    ctx.lineTo(4, -4);
    ctx.lineTo(12, 4);
    ctx.lineTo(38, 4);
    ctx.lineTo(42, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White Racing Stripe
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-38, 2, 74, 5);

    // Front Headlight
    ctx.fillStyle = '#FFF176';
    ctx.strokeStyle = '#FBC02D';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(39, 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rear Spare Tire
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(-42, 2, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMonster(ctx, isHeadBroken, neckAngle) {
    // 1. Driver
    this.drawDriver(ctx, -4, -14, isHeadBroken, neckAngle);

    // 2. Roll Cage
    ctx.strokeStyle = '#FF6F00';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-36, -6);
    ctx.lineTo(-22, -36);
    ctx.lineTo(14, -36);
    ctx.lineTo(26, -6);
    ctx.stroke();

    // 3. Huge Truck Body
    ctx.fillStyle = '#29B6F6';
    ctx.strokeStyle = '#0288D1';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-46, 12);
    ctx.lineTo(-46, -6);
    ctx.lineTo(-22, -6);
    ctx.lineTo(14, -6);
    ctx.lineTo(24, 0);
    ctx.lineTo(44, 0);
    ctx.lineTo(46, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flame graphic on body
    ctx.fillStyle = '#FF9100';
    ctx.beginPath();
    ctx.moveTo(-15, 6);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(25, 2);
    ctx.lineTo(15, 8);
    ctx.closePath();
    ctx.fill();

    // Massive engine blower on hood
    ctx.fillStyle = '#ECEFF1';
    ctx.strokeStyle = '#78909C';
    ctx.lineWidth = 2;
    ctx.fillRect(18, -12, 16, 12);
    ctx.fillStyle = '#D32F2F'; // Red intake butterflies
    ctx.fillRect(20, -14, 4, 3);
    ctx.fillRect(28, -14, 4, 3);
  }

  drawBuggy(ctx, isHeadBroken, neckAngle) {
    // 1. Driver
    this.drawDriver(ctx, -10, -6, isHeadBroken, neckAngle);

    // 2. Tubular Space Frame
    ctx.strokeStyle = '#43A047';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-42, 6);
    ctx.lineTo(-30, -24);
    ctx.lineTo(6, -24);
    ctx.lineTo(36, 6);
    ctx.stroke();

    // 3. Rear Spoiler / Wing
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(-44, -20);
    ctx.stroke();

    ctx.fillStyle = '#43A047';
    ctx.fillRect(-48, -24, 18, 5);

    // Sleek lower panels
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath();
    ctx.moveTo(-36, 10);
    ctx.lineTo(-24, 0);
    ctx.lineTo(18, 0);
    ctx.lineTo(36, 10);
    ctx.closePath();
    ctx.fill();
  }

  drawBike(ctx, isHeadBroken, neckAngle) {
    // 1. Leaning Motocross Driver
    ctx.save();
    ctx.translate(-4, -14);
    // Dynamic rider lean
    this.drawDriver(ctx, 0, 0, isHeadBroken, neckAngle);
    ctx.restore();

    // 2. Dirt Bike Frame & Exhaust
    ctx.strokeStyle = '#FF3D00';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-24, 12); // Swingarm
    ctx.lineTo(-4, 0);
    ctx.lineTo(18, -4);
    ctx.lineTo(24, 12); // Front forks
    ctx.stroke();

    // Handlebars
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(14, -8);
    ctx.lineTo(18, -16);
    ctx.stroke();

    // Plastics / Fairing
    ctx.fillStyle = '#FF3D00';
    ctx.beginPath();
    ctx.moveTo(-18, 2);
    ctx.lineTo(-4, -6);
    ctx.lineTo(16, -6);
    ctx.lineTo(8, 2);
    ctx.closePath();
    ctx.fill();

    // Front high fender
    ctx.fillStyle = '#FF3D00';
    ctx.beginPath();
    ctx.moveTo(18, -4);
    ctx.lineTo(32, -2);
    ctx.lineTo(26, 2);
    ctx.closePath();
    ctx.fill();
  }
}

window.vehicleManager = new VehicleManager();
