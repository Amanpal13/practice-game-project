/**
 * Main Hill Climb Game Loop, Camera, Input, HUD, and State Controller
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // High DPI scaling
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Game state: 'GARAGE', 'PLAYING', 'PAUSED', 'GAME_OVER'
    this.state = 'GARAGE';

    // Player bank & stats (UNLIMITED MONEY)
    this.coins = 999999999;
    this.sessionCoins = 0;
    this.loadUserData();

    // Camera
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1.0,
      targetZoom: 1.0,
      shake: 0
    };

    // Input state
    this.keys = {
      gas: false,
      brake: false
    };

    // Active vehicle physics
    this.vehicle = null;

    // Time tracking
    this.lastTime = performance.now();

    // Setup
    this.initCanvasSize();
    this.initInputs();
    this.setupGarageUI();

    window.addEventListener('resize', () => this.initCanvasSize());

    // Start render loop
    requestAnimationFrame((t) => this.loop(t));
  }

  loadUserData() {
    this.coins = 999999999;
    try {
      localStorage.setItem('hcr_coins', '999999999');
    } catch (e) {
      console.warn("Could not save coins:", e);
    }
  }

  saveUserData() {
    this.coins = 999999999;
    try {
      localStorage.setItem('hcr_coins', '999999999');
    } catch (e) {
      console.warn("Could not save coins:", e);
    }
  }

  addBonusCoins(amount) {
    this.sessionCoins += amount;
    this.coins += amount;
    this.saveUserData();
    this.updateHUDCoins();
  }

  initCanvasSize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(this.dpr, this.dpr);
  }

  // --- Input Bindings ---
  initInputs() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      // Audio unlock on user gesture
      window.soundManager.init();

      if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.keys.gas = true;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.keys.brake = true;
      }
      if (e.code === 'Space') {
        if (this.state === 'PLAYING') {
          window.soundManager.playHorn();
        } else if (this.state === 'GAME_OVER') {
          this.startRace();
        }
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'PLAYING') this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.keys.gas = false;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.keys.brake = false;
      }
    });

    // Touch & Mouse Pedals
    const gasBtn = document.getElementById('gasPedal');
    const brakeBtn = document.getElementById('brakePedal');

    const handlePress = (key, active, elem) => {
      window.soundManager.init();
      this.keys[key] = active;
      if (active) elem.classList.add('active');
      else elem.classList.remove('active');
    };

    if (gasBtn) {
      gasBtn.addEventListener('mousedown', (e) => { e.preventDefault(); handlePress('gas', true, gasBtn); });
      window.addEventListener('mouseup', () => handlePress('gas', false, gasBtn));
      gasBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handlePress('gas', true, gasBtn); }, { passive: false });
      gasBtn.addEventListener('touchend', (e) => { e.preventDefault(); handlePress('gas', false, gasBtn); }, { passive: false });
      gasBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); handlePress('gas', false, gasBtn); }, { passive: false });
    }

    if (brakeBtn) {
      brakeBtn.addEventListener('mousedown', (e) => { e.preventDefault(); handlePress('brake', true, brakeBtn); });
      window.addEventListener('mouseup', () => handlePress('brake', false, brakeBtn));
      brakeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handlePress('brake', true, brakeBtn); }, { passive: false });
      brakeBtn.addEventListener('touchend', (e) => { e.preventDefault(); handlePress('brake', false, brakeBtn); }, { passive: false });
      brakeBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); handlePress('brake', false, brakeBtn); }, { passive: false });
    }

    // UI Buttons
    document.getElementById('startRaceBtn')?.addEventListener('click', () => {
      window.soundManager.playClick();
      this.startRace();
    });

    document.getElementById('pauseBtn')?.addEventListener('click', () => {
      window.soundManager.playClick();
      this.togglePause();
    });

    document.getElementById('resumeBtn')?.addEventListener('click', () => {
      window.soundManager.playClick();
      this.togglePause();
    });

    document.getElementById('pauseRestartBtn')?.addEventListener('click', () => {
      window.soundManager.playClick();
      this.startRace();
    });

    document.getElementById('pauseGarageBtn')?.addEventListener('click', () => {
      window.soundManager.playClick();
      this.returnToGarage();
    });

    document.getElementById('gameOverRetryBtn')?.addEventListener('click', () => {
      window.soundManager.playClick();
      this.startRace();
    });

    document.getElementById('gameOverGarageBtn')?.addEventListener('click', () => {
      window.soundManager.playClick();
      this.returnToGarage();
    });

    document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
      const isMuted = window.soundManager.toggleMute();
      this.updateSoundIcon(isMuted);
    });

    document.getElementById('garageSoundBtn')?.addEventListener('click', () => {
      const isMuted = window.soundManager.toggleMute();
      this.updateSoundIcon(isMuted);
    });

    // Mute icon initialization
    this.updateSoundIcon(window.soundManager.muted);
  }

  updateSoundIcon(isMuted) {
    const icons = document.querySelectorAll('.sound-icon');
    icons.forEach(icon => {
      icon.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  // --- Start & Transition Logic ---

  startRace() {
    window.soundManager.init();

    // Prepare stage and track
    const stageId = window.terrainSystem.stageId;
    window.terrainSystem.generateTrack();

    // Create Vehicle Physics
    const vDef = window.vehicleManager.getCurrentVehicle();
    const stageCfg = window.terrainSystem.stages[stageId];
    this.vehicle = new VehiclePhysics(vDef, stageCfg);
    this.vehicle.reset();

    // Reset session stats
    this.sessionCoins = 0;
    this.camera.x = this.vehicle.x + 100;
    this.camera.y = this.vehicle.y;
    this.camera.zoom = 1.0;
    window.particleSystem.reset();

    // Switch state to PLAYING
    this.state = 'PLAYING';

    // UI visibility
    document.getElementById('garageScreen').classList.add('hidden');
    document.getElementById('gameOverModal').classList.add('hidden');
    document.getElementById('pauseModal').classList.add('hidden');
    document.getElementById('gameHUD').classList.remove('hidden');
    document.getElementById('controlsOverlay').classList.remove('hidden');

    this.updateHUDCoins();
  }

  returnToGarage() {
    window.soundManager.updateEngine(0, false, false);
    this.state = 'GARAGE';

    document.getElementById('gameHUD').classList.add('hidden');
    document.getElementById('controlsOverlay').classList.add('hidden');
    document.getElementById('pauseModal').classList.add('hidden');
    document.getElementById('gameOverModal').classList.add('hidden');
    document.getElementById('garageScreen').classList.remove('hidden');

    this.setupGarageUI();
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      window.soundManager.updateEngine(0, false, false);
      document.getElementById('pauseModal').classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      document.getElementById('pauseModal').classList.add('hidden');
    }
  }

  onVehicleCrashed(reason) {
    const meters = this.vehicle.distanceTraveled;
    const stageId = window.terrainSystem.stageId;
    const isNewRecord = window.terrainSystem.saveBestRecord(stageId, meters);

    setTimeout(() => {
      this.state = 'GAME_OVER';
      document.getElementById('gameOverTitle').textContent = reason;
      document.getElementById('gameOverDistance').textContent = `${meters} m`;
      document.getElementById('gameOverCoins').textContent = `+${this.sessionCoins}`;
      document.getElementById('gameOverTotalCoins').textContent = this.coins.toLocaleString();

      const newRecordBadge = document.getElementById('newRecordBadge');
      if (newRecordBadge) {
        newRecordBadge.style.display = isNewRecord ? 'block' : 'none';
      }

      document.getElementById('gameOverModal').classList.remove('hidden');
    }, 1100);
  }

  // --- Item Pickup Checks ---
  checkCollectibles() {
    if (!this.vehicle || this.vehicle.crashed) return;

    const terrain = window.terrainSystem;
    const carX = this.vehicle.x;
    const carY = this.vehicle.y;

    // Fuel cans
    for (let i = 0; i < terrain.fuelCans.length; i++) {
      const f = terrain.fuelCans[i];
      if (f.collected || Math.abs(f.x - carX) > 60) continue;

      const dist = Math.hypot(f.x - carX, f.y - carY);
      if (dist < 46) {
        f.collected = true;
        this.vehicle.fuel = 100;
        this.vehicle.isOutOfFuel = false;
        window.soundManager.playFuel();
        window.particleSystem.emitCoinSparkles(f.x, f.y, '#FF1744');
        window.particleSystem.addFloatingText("FUEL 100%!", f.x, f.y - 30, '#00E676', 24);
      }
    }

    // Coins and Diamonds
    for (let i = 0; i < terrain.coins.length; i++) {
      const c = terrain.coins[i];
      if (c.collected || Math.abs(c.x - carX) > 60) continue;

      const dist = Math.hypot(c.x - carX, c.y - carY);
      if (dist < 42) {
        c.collected = true;
        this.addBonusCoins(c.value);
        window.soundManager.playCoin();

        const color = c.type === 'diamond' ? '#FF1744' : (c.type === 'silver' ? '#CFD8DC' : '#FFD700');
        window.particleSystem.emitCoinSparkles(c.x, c.y, color);
        window.particleSystem.addFloatingText(`+${c.value}`, c.x, c.y - 20, color, c.type === 'diamond' ? 24 : 18);
      }
    }
  }

  // --- HUD Updates ---
  updateHUD() {
    if (!this.vehicle) return;

    // Distance
    const distElem = document.getElementById('hudDistance');
    if (distElem) distElem.textContent = `${this.vehicle.distanceTraveled} m`;

    // Best Record
    const bestElem = document.getElementById('hudBestRecord');
    if (bestElem) {
      const best = window.terrainSystem.getBestRecord(window.terrainSystem.stageId);
      bestElem.textContent = `Record: ${best} m`;
    }

    // Fuel Gauge
    const fuelBar = document.getElementById('fuelBarInner');
    const fuelGauge = document.getElementById('fuelGaugeContainer');
    if (fuelBar) {
      const pct = Math.max(0, Math.min(100, this.vehicle.fuel));
      fuelBar.style.width = `${pct}%`;
      if (pct < 20) {
        fuelGauge.classList.add('low-fuel-blink');
      } else {
        fuelGauge.classList.remove('low-fuel-blink');
      }
    }

    // RPM & Speedometer needle
    const speedGaugeNeedle = document.getElementById('speedNeedle');
    if (speedGaugeNeedle) {
      const speed = Math.hypot(this.vehicle.vx, this.vehicle.vy);
      const angle = -120 + Math.min(1.0, speed / 650) * 240;
      speedGaugeNeedle.style.transform = `rotate(${angle}deg)`;
    }

    const rpmGaugeNeedle = document.getElementById('rpmNeedle');
    if (rpmGaugeNeedle) {
      const rpmAngle = -120 + this.vehicle.rpm * 240;
      rpmGaugeNeedle.style.transform = `rotate(${rpmAngle}deg)`;
    }
  }

  updateHUDCoins() {
    const coinElem = document.getElementById('hudCoins');
    if (coinElem) coinElem.textContent = this.coins.toLocaleString();
    const garageCoins = document.getElementById('garageCoins');
    if (garageCoins) garageCoins.textContent = this.coins.toLocaleString();
  }

  // --- Main Animation Loop ---
  loop(now) {
    const dt = Math.min(0.045, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'GAME_OVER') {
      if (this.state === 'PLAYING') {
        this.vehicle.update(this.keys.gas, this.keys.brake, dt);
        this.checkCollectibles();
        window.terrainSystem.update(now * 0.001);
        window.particleSystem.update(dt * 60);
      }

      this.updateCamera(dt);
      this.render();
      this.updateHUD();
    } else if (this.state === 'GARAGE') {
      this.renderGarageBackground();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  updateCamera(dt) {
    if (!this.vehicle) return;

    // Follow vehicle with forward lead
    const speed = Math.hypot(this.vehicle.vx, this.vehicle.vy);
    const targetCamX = this.vehicle.x + Math.min(260, this.vehicle.vx * 0.35);
    const targetCamY = this.vehicle.y - 40;

    // Smooth camera damping
    this.camera.x += (targetCamX - this.camera.x) * 0.12;
    this.camera.y += (targetCamY - this.camera.y) * 0.12;

    // Dynamic zoom out when fast or airborne
    const targetZoom = Math.max(0.72, 1.05 - (speed / 850) * 0.35);
    this.camera.zoom += (targetZoom - this.camera.zoom) * 0.05;
  }

  render() {
    const terrain = window.terrainSystem;

    // 1. Parallax Sky & Background
    terrain.drawBackground(this.ctx, this.camera, this.width, this.height);

    // 2. World Space Transformation
    this.ctx.save();
    this.ctx.translate(this.width * 0.38, this.height * 0.62);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Visible world bounds
    const viewHalfW = (this.width / this.camera.zoom) * 0.6;
    const viewHalfH = (this.height / this.camera.zoom) * 0.6;
    const viewLeft = this.camera.x - viewHalfW;
    const viewRight = this.camera.x + viewHalfW;
    const viewBottom = this.camera.y + viewHalfH;

    // 3. Foreground Terrain and Props
    terrain.drawForeground(this.ctx, this.camera, viewLeft, viewRight, viewBottom);

    // 4. Vehicle
    if (this.vehicle) {
      this.vehicle.draw(this.ctx);
    }

    // 5. Particles & Stunt Texts
    window.particleSystem.draw(this.ctx);

    this.ctx.restore();
  }

  renderGarageBackground() {
    // Elegant garage backdrop
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#1E293B');
    grad.addColorStop(1, '#0F172A');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // --- Garage & Upgrades UI Controller ---
  setupGarageUI() {
    this.updateHUDCoins();

    const vm = window.vehicleManager;
    const ts = window.terrainSystem;

    // Populate Vehicle Carousel / Cards
    const vehicleListElem = document.getElementById('garageVehicleList');
    if (vehicleListElem) {
      vehicleListElem.innerHTML = '';
      for (const vid in vm.vehicles) {
        const v = vm.vehicles[vid];
        const card = document.createElement('div');
        card.className = `vehicle-card ${vm.selectedVehicleId === vid ? 'selected' : ''} ${!v.unlocked ? 'locked' : ''}`;
        card.innerHTML = `
          <div class="vehicle-card-title">${v.name}</div>
          <div class="vehicle-card-preview" id="preview_${vid}"></div>
          <div class="vehicle-card-status">
            ${v.unlocked ? (vm.selectedVehicleId === vid ? 'SELECTED' : 'SELECT') : `🔒 $${v.cost.toLocaleString()}`}
          </div>
        `;

        card.addEventListener('click', () => {
          window.soundManager.playClick();
          if (v.unlocked) {
            vm.selectVehicle(vid);
            this.setupGarageUI();
          } else {
            const res = vm.unlockVehicle(vid, 999999999);
            if (res.success) {
              this.coins = 999999999;
              this.saveUserData();
              window.soundManager.playUpgrade();
              this.setupGarageUI();
            }
          }
        });

        vehicleListElem.appendChild(card);
        this.drawGarageVehicleThumb(vid);
      }
    }

    // Populate Upgrade Buttons for selected vehicle
    const currentV = vm.getCurrentVehicle();
    const upgradeTypes = [
      { id: 'engine', name: 'Engine', icon: '⚡' },
      { id: 'suspension', name: 'Suspension', icon: '🌀' },
      { id: 'tires', name: 'Tires', icon: '⭕' },
      { id: 'fourWheelDrive', name: '4WD', icon: '🏎️' }
    ];

    const upgradeGrid = document.getElementById('garageUpgradeGrid');
    if (upgradeGrid) {
      upgradeGrid.innerHTML = '';
      upgradeTypes.forEach(upg => {
        const currentLvl = currentV.upgrades[upg.id] || 1;
        const cost = vm.getUpgradeCost(currentV.id, upg.id);
        const isMax = cost === null;

        const tile = document.createElement('div');
        tile.className = 'upgrade-tile';
        tile.innerHTML = `
          <div class="upgrade-header">
            <span class="upgrade-icon">${upg.icon}</span>
            <span class="upgrade-name">${upg.name}</span>
            <span class="upgrade-lvl">Lv.${currentLvl}</span>
          </div>
          <div class="upgrade-bar">
            <div class="upgrade-bar-fill" style="width: ${(currentLvl / vm.maxUpgradeLevel) * 100}%"></div>
          </div>
          <button class="upgrade-btn ${isMax ? 'maxed' : (this.coins < cost ? 'disabled' : '')}">
            ${isMax ? 'MAXED' : `$${cost.toLocaleString()}`}
          </button>
        `;

        const btn = tile.querySelector('.upgrade-btn');
        if (!isMax) {
          btn.addEventListener('click', () => {
            const res = vm.upgradePart(currentV.id, upg.id, 999999999);
            if (res.success) {
              this.coins = 999999999;
              this.saveUserData();
              window.soundManager.playUpgrade();
              this.setupGarageUI();
            }
          });
        }

        upgradeGrid.appendChild(tile);
      });
    }

    // Populate Stage Selection
    const stageList = document.getElementById('garageStageList');
    if (stageList) {
      stageList.innerHTML = '';
      for (const sid in ts.stages) {
        const s = ts.stages[sid];
        const bestRec = ts.getBestRecord(sid);
        const isSelected = ts.stageId === sid;

        const stageCard = document.createElement('div');
        stageCard.className = `stage-card ${isSelected ? 'selected' : ''} ${!s.unlocked ? 'locked' : ''}`;
        stageCard.innerHTML = `
          <div class="stage-name">${s.name}</div>
          <div class="stage-record">${s.unlocked ? `Best: ${bestRec} m` : `🔒 $${s.cost.toLocaleString()}`}</div>
        `;

        stageCard.addEventListener('click', () => {
          window.soundManager.playClick();
          if (s.unlocked) {
            ts.setStage(sid);
            this.setupGarageUI();
          } else {
            const res = ts.unlockStage(sid, 999999999);
            if (res.success) {
              this.coins = 999999999;
              this.saveUserData();
              window.soundManager.playUpgrade();
              ts.setStage(sid);
              this.setupGarageUI();
            }
          }
        });

        stageList.appendChild(stageCard);
      }
    }
  }

  drawGarageVehicleThumb(vid) {
    const container = document.getElementById(`preview_${vid}`);
    if (!container) return;
    container.innerHTML = '';

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 150;
    thumbCanvas.height = 80;
    const tCtx = thumbCanvas.getContext('2d');
    container.appendChild(thumbCanvas);

    const vDef = window.vehicleManager.vehicles[vid];
    tCtx.save();
    tCtx.translate(75, 45);
    tCtx.scale(0.85, 0.85);

    // Draw wheels
    window.vehicleManager.drawWheel(tCtx, vDef.rearWheelOffset.x, vDef.rearWheelOffset.y + vDef.springRestLength, vDef.wheelRadius, 0);
    window.vehicleManager.drawWheel(tCtx, vDef.frontWheelOffset.x, vDef.frontWheelOffset.y + vDef.springRestLength, vDef.wheelRadius, 0);

    // Springs
    window.vehicleManager.drawSpring(tCtx, vDef.rearWheelOffset.x, vDef.rearWheelOffset.y, vDef.rearWheelOffset.x, vDef.rearWheelOffset.y + vDef.springRestLength);
    window.vehicleManager.drawSpring(tCtx, vDef.frontWheelOffset.x, vDef.frontWheelOffset.y, vDef.frontWheelOffset.x, vDef.frontWheelOffset.y + vDef.springRestLength);

    // Body
    window.vehicleManager.drawVehicleBody(tCtx, vDef, false, 0);
    tCtx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
