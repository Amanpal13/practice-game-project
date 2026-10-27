/**
 * 2D Vehicle Physics Engine
 * Implements high-stability raycast/continuous spring suspension,
 * Coulomb wheel traction, aerodynamic mid-air tilt leveling,
 * ragdoll bobblehead driver, and stunt detection.
 */

class VehiclePhysics {
  constructor(vehicleDef, stageConfig) {
    this.def = vehicleDef;
    this.stage = stageConfig;

    // Upgrades
    const up = vehicleDef.upgrades || { engine: 1, suspension: 1, tires: 1, fourWheelDrive: 1 };
    this.engineLevel = up.engine || 1;
    this.suspensionLevel = up.suspension || 1;
    this.tiresLevel = up.tires || 1;
    this.fwdLevel = up.fourWheelDrive || 1;

    // Chassis state
    this.x = 80;
    this.y = window.terrainSystem.getHeight(this.x) - 48;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVelocity = 0;

    // Mass and Inertia
    this.mass = vehicleDef.mass || 1.0;
    const w = vehicleDef.width;
    const h = vehicleDef.height;
    this.inertia = (this.mass * (w * w + h * h) / 12) * 1.5;

    // Wheels state
    this.rearWheel = {
      x: this.x + vehicleDef.rearWheelOffset.x,
      y: this.y + vehicleDef.rearWheelOffset.y + vehicleDef.springRestLength,
      radius: vehicleDef.wheelRadius,
      angle: 0,
      angularVelocity: 0,
      grounded: false,
      skidding: false,
      springLength: vehicleDef.springRestLength,
      contactNormal: { x: 0, y: -1 },
      contactTangent: { x: 1, y: 0 }
    };

    this.frontWheel = {
      x: this.x + vehicleDef.frontWheelOffset.x,
      y: this.y + vehicleDef.frontWheelOffset.y + vehicleDef.springRestLength,
      radius: vehicleDef.wheelRadius,
      angle: 0,
      angularVelocity: 0,
      grounded: false,
      skidding: false,
      springLength: vehicleDef.springRestLength,
      contactNormal: { x: 0, y: -1 },
      contactTangent: { x: 1, y: 0 }
    };

    // Upgraded parameters
    const engineMult = 1 + (this.engineLevel - 1) * 0.16;
    this.driveTorque = vehicleDef.baseTorque * engineMult;
    this.maxWheelSpeed = vehicleDef.baseSpeed * (1 + (this.engineLevel - 1) * 0.08);

    const suspMult = 1 + (this.suspensionLevel - 1) * 0.15;
    this.springStiffness = vehicleDef.springStiffness * suspMult;
    this.springDamping = vehicleDef.springDamping * Math.sqrt(suspMult);
    this.springRestLength = vehicleDef.springRestLength;

    const tireMult = 1 + (this.tiresLevel - 1) * 0.15;
    this.tireFriction = vehicleDef.baseFriction * tireMult * (this.stage.friction || 1.0);

    // 4WD torque distribution
    this.frontDriveRatio = 0.15 + Math.min(0.45, (this.fwdLevel - 1) * 0.045);

    // Driver Head
    this.driverHead = {
      x: this.x + vehicleDef.headOffset.x,
      y: this.y + vehicleDef.headOffset.y,
      radius: 9,
      angle: 0,
      isBroken: false
    };

    // Fuel State
    this.fuel = 100;
    this.isOutOfFuel = false;
    this.fuelDrainRate = 1.8;
    this.fuelThrottleDrain = 4.8;

    // Stunt Tracking
    this.isAirborne = false;
    this.airTime = 0;
    this.cumulativeAirRotation = 0;
    this.lastAirAngle = 0;
    this.wheelieTimer = 0;

    // Status flags
    this.crashed = false;
    this.crashReason = '';
    this.rpm = 0.15;
    this.throttleActive = false;
    this.brakeActive = false;
    this.distanceTraveled = 0;
  }

  reset() {
    this.x = 80;
    this.y = window.terrainSystem.getHeight(this.x) - 48;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVelocity = 0;

    this.rearWheel.x = this.x + this.def.rearWheelOffset.x;
    this.rearWheel.y = this.y + this.def.rearWheelOffset.y + this.springRestLength;
    this.rearWheel.angle = 0;
    this.rearWheel.angularVelocity = 0;
    this.rearWheel.grounded = false;

    this.frontWheel.x = this.x + this.def.frontWheelOffset.x;
    this.frontWheel.y = this.y + this.def.frontWheelOffset.y + this.springRestLength;
    this.frontWheel.angle = 0;
    this.frontWheel.angularVelocity = 0;
    this.frontWheel.grounded = false;

    this.driverHead.x = this.x + this.def.headOffset.x;
    this.driverHead.y = this.y + this.def.headOffset.y;
    this.driverHead.angle = 0;
    this.driverHead.isBroken = false;

    this.fuel = 100;
    this.isOutOfFuel = false;
    this.crashed = false;
    this.crashReason = '';
    this.airTime = 0;
    this.cumulativeAirRotation = 0;
    this.wheelieTimer = 0;
    this.distanceTraveled = 0;
  }

  toWorld(localX, localY) {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    return {
      x: this.x + localX * cos - localY * sin,
      y: this.y + localX * sin + localY * cos
    };
  }

  update(inputGas, inputBrake, dt) {
    if (this.crashed) {
      this.updatePostCrash(dt);
      return;
    }

    this.throttleActive = inputGas && !this.isOutOfFuel;
    this.brakeActive = inputBrake;

    // Fuel consumption
    if (this.fuel > 0) {
      const consumption = (this.fuelDrainRate + (this.throttleActive ? this.fuelThrottleDrain : 0)) * dt;
      this.fuel = Math.max(0, this.fuel - consumption);
      if (this.fuel <= 0) {
        this.isOutOfFuel = true;
      }
    }

    // 4 Substeps per frame for high stability
    const substeps = 4;
    const subDt = dt / substeps;

    for (let s = 0; s < substeps; s++) {
      this.stepPhysics(inputGas && !this.isOutOfFuel, inputBrake, subDt);
    }

    // Distance Tracker
    const meters = Math.max(0, Math.floor(this.x / 20));
    if (meters > this.distanceTraveled) {
      this.distanceTraveled = meters;
    }

    // Out of Fuel check
    if (this.isOutOfFuel && Math.abs(this.vx) < 5.0 && (this.rearWheel.grounded || this.frontWheel.grounded)) {
      this.triggerCrash("OUT OF FUEL!");
    }

    // Stunts & Visuals
    this.updateStunts(dt);
    this.updateAudioAndFX(dt);
  }

  stepPhysics(gas, brake, dt) {
    const terrain = window.terrainSystem;
    const gravity = (terrain.gravity || 9.8) * 100; // Pixel gravity acceleration

    let fTotalX = 0;
    let fTotalY = this.mass * gravity;
    let torqueTotal = 0;

    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);

    // Suspension vector pointing downwards relative to car chassis
    const suspAxisX = -sinA;
    const suspAxisY = cosA;

    const wheelConfigs = [
      { wheel: this.rearWheel, offset: this.def.rearWheelOffset, isRear: true },
      { wheel: this.frontWheel, offset: this.def.frontWheelOffset, isRear: false }
    ];

    for (let i = 0; i < wheelConfigs.length; i++) {
      const { wheel, offset, isRear } = wheelConfigs[i];

      // Anchor in world coords
      const ax = this.x + offset.x * cosA - offset.y * sinA;
      const ay = this.y + offset.x * sinA + offset.y * cosA;

      // Rest position of wheel
      const restLen = this.springRestLength;
      const r = wheel.radius;

      // Sample terrain under wheel
      const probeX = ax + suspAxisX * restLen;
      const gy = terrain.getHeight(probeX);
      const groundNormal = terrain.getNormal(probeX);
      const groundTangent = terrain.getTangent(probeX);

      // Distance from anchor to ground along suspension ray
      const effSuspY = Math.max(0.15, suspAxisY);
      const distToGround = (gy - ay) / effSuspY;
      const maxExt = restLen + r;

      if (distToGround < maxExt) {
        // Wheel in contact with ground!
        wheel.grounded = true;
        wheel.contactNormal = groundNormal;
        wheel.contactTangent = groundTangent;

        const compression = Math.max(0, Math.min(restLen * 0.85, maxExt - distToGround));
        wheel.springLength = restLen - compression;

        // Position wheel exactly on ground contact surface
        wheel.x = ax + suspAxisX * (restLen - compression);
        wheel.y = ay + suspAxisY * (restLen - compression);

        // Relative compression velocity
        const vAx = this.vx - this.angularVelocity * (ay - this.y);
        const vAy = this.vy + this.angularVelocity * (ax - this.x);
        const vComp = vAx * suspAxisX + vAy * suspAxisY;

        // Damped Spring force
        let fSpring = compression * this.springStiffness + Math.max(0, vComp) * this.springDamping;
        fSpring = Math.max(0, fSpring);

        // Normal ground reaction pushing UP on chassis
        const fNormX = -suspAxisX * fSpring;
        const fNormY = -suspAxisY * fSpring;
        fTotalX += fNormX;
        fTotalY += fNormY;

        // Torque from suspension normal
        const rx = ax - this.x;
        const ry = ay - this.y;
        torqueTotal += (rx * fNormY - ry * fNormX);

        // --- Drive Traction & Braking ---
        const driveRatio = isRear ? (1 - this.frontDriveRatio) : this.frontDriveRatio;
        const speedAlongTangent = this.vx * groundTangent.x + this.vy * groundTangent.y;

        if (gas) {
          const targetDriveForce = this.driveTorque * driveRatio;
          const maxFric = fSpring * this.tireFriction * 1.5;
          const appliedDrive = Math.min(targetDriveForce, maxFric);

          if (targetDriveForce > maxFric) {
            wheel.skidding = true;
          } else {
            wheel.skidding = false;
          }

          // Push chassis along ground tangent
          fTotalX += groundTangent.x * appliedDrive;
          fTotalY += groundTangent.y * appliedDrive;

          // Wheelie torque transfer (rear wheel pushes front up)
          torqueTotal += -ry * appliedDrive * 0.28;

          // Spin wheel
          if (speedAlongTangent < this.maxWheelSpeed) {
            wheel.angularVelocity = Math.min(this.maxWheelSpeed / (r * 0.05), wheel.angularVelocity + 25 * dt);
          }
        } else if (brake) {
          // Braking force
          const brakeForce = -Math.sign(speedAlongTangent || 1) * this.driveTorque * 1.2;
          fTotalX += groundTangent.x * brakeForce;
          fTotalY += groundTangent.y * brakeForce;
          wheel.angularVelocity *= (1 - 12 * dt);
          wheel.skidding = Math.abs(speedAlongTangent) > 10;
        } else {
          wheel.angularVelocity *= (1 - 1.2 * dt);
          wheel.skidding = false;
        }

        // Wheel roll angle
        wheel.angle += (speedAlongTangent / r) * dt;

      } else {
        // Airborne
        wheel.grounded = false;
        wheel.skidding = false;
        wheel.springLength = restLen;
        wheel.x = ax + suspAxisX * restLen;
        wheel.y = ay + suspAxisY * restLen;

        if (gas) wheel.angle += 35 * dt;
        else if (brake) wheel.angle *= (1 - 8 * dt);
      }
    }

    // Mid-air pitch control (Both wheels in the air)
    const bothInAir = !this.rearWheel.grounded && !this.frontWheel.grounded;
    if (bothInAir) {
      const airPitchSpeed = 4.4;
      if (gas) {
        // Counter-clockwise (nose up / backflip)
        this.angularVelocity -= airPitchSpeed * dt;
      }
      if (brake) {
        // Clockwise (nose down / frontflip)
        this.angularVelocity += airPitchSpeed * dt;
      }
    }

    // Integrate Chassis
    this.vx += (fTotalX / this.mass) * dt;
    this.vy += (fTotalY / this.mass) * dt;
    this.angularVelocity += (torqueTotal / this.inertia) * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.angularVelocity * dt;

    // Damping / Air drag
    this.vx *= (1 - 0.015 * dt);
    this.vy *= (1 - 0.01 * dt);
    this.angularVelocity *= (1 - 0.08 * dt);

    // Update Head & Collision Checks
    this.updateDriverHead();
    this.checkChassisCollision();
  }

  updateDriverHead() {
    const idealHead = this.toWorld(this.def.headOffset.x, this.def.headOffset.y);
    this.driverHead.x = idealHead.x;
    this.driverHead.y = idealHead.y;

    // Head bobs dynamically with acceleration & car tilt
    this.driverHead.angle = -this.angularVelocity * 0.25 + (this.vx / 600) * 0.2;

    // Head collision with terrain -> Neck broken!
    const gy = window.terrainSystem.getHeight(this.driverHead.x);
    if (this.driverHead.y + this.driverHead.radius >= gy) {
      // Only crash if inverted or head significantly impacts ground
      if (Math.cos(this.angle) < 0.4 || this.vy > 10) {
        this.driverHead.isBroken = true;
        this.triggerCrash("DRIVER DOWN - NECK BROKEN!");
      }
    }
  }

  checkChassisCollision() {
    // If vehicle flips upside down and roof hits terrain
    if (Math.cos(this.angle) < -0.15) {
      const roofPoints = [
        this.toWorld(this.def.width * 0.4, -this.def.height * 0.4),
        this.toWorld(-this.def.width * 0.4, -this.def.height * 0.4)
      ];

      for (let i = 0; i < roofPoints.length; i++) {
        const p = roofPoints[i];
        const gy = window.terrainSystem.getHeight(p.x);
        if (p.y >= gy - 4) {
          window.particleSystem.emitCrashDebris(p.x, p.y);
          this.driverHead.isBroken = true;
          this.triggerCrash("FLIPPED OVER!");
          break;
        }
      }
    }
  }

  updateStunts(dt) {
    const bothInAir = !this.rearWheel.grounded && !this.frontWheel.grounded;

    if (bothInAir) {
      if (!this.isAirborne) {
        this.isAirborne = true;
        this.airTime = 0;
        this.cumulativeAirRotation = 0;
        this.lastAirAngle = this.angle;
      }

      this.airTime += dt;

      let dTheta = this.angle - this.lastAirAngle;
      while (dTheta > Math.PI) dTheta -= Math.PI * 2;
      while (dTheta < -Math.PI) dTheta += Math.PI * 2;
      this.cumulativeAirRotation += dTheta;
      this.lastAirAngle = this.angle;

      // Backflip
      if (this.cumulativeAirRotation <= -Math.PI * 1.88) {
        this.cumulativeAirRotation += Math.PI * 2;
        window.soundManager.playFanfare();
        window.particleSystem.addFloatingText("BACKFLIP! +500", this.x, this.y - 60, '#FFD700', 28);
        window.gameInstance.addBonusCoins(500);
      }
      // Frontflip
      else if (this.cumulativeAirRotation >= Math.PI * 1.88) {
        this.cumulativeAirRotation -= Math.PI * 2;
        window.soundManager.playFanfare();
        window.particleSystem.addFloatingText("FRONTFLIP! +500", this.x, this.y - 60, '#00E676', 28);
        window.gameInstance.addBonusCoins(500);
      }

    } else {
      if (this.isAirborne) {
        if (this.airTime > 1.2) {
          const bonus = Math.floor(this.airTime * 140);
          window.soundManager.playFanfare();
          window.particleSystem.addFloatingText(`AIR TIME ${this.airTime.toFixed(1)}s! +${bonus}`, this.x, this.y - 50, '#00E5FF', 24);
          window.gameInstance.addBonusCoins(bonus);
        }
        this.isAirborne = false;
        this.airTime = 0;
      }

      // Wheelie check
      if (this.rearWheel.grounded && !this.frontWheel.grounded && this.angle < -0.4 && this.vx > 80) {
        this.wheelieTimer += dt;
        if (this.wheelieTimer > 1.2) {
          this.wheelieTimer = 0;
          window.soundManager.playFanfare();
          window.particleSystem.addFloatingText("WHEELIE! +250", this.x, this.y - 50, '#FF9100', 24);
          window.gameInstance.addBonusCoins(250);
        }
      } else {
        this.wheelieTimer = 0;
      }
    }
  }

  updateAudioAndFX(dt) {
    let targetRpm = 0.15;
    if (this.throttleActive) {
      targetRpm = 0.5 + Math.min(0.5, Math.abs(this.vx) / 600);
    }
    this.rpm += (targetRpm - this.rpm) * 0.12;

    window.soundManager.updateEngine(this.rpm, this.throttleActive, !this.crashed);

    const isSkidding = this.rearWheel.skidding || this.frontWheel.skidding;
    window.soundManager.updateSkid(isSkidding ? 1.0 : 0);

    const terrain = window.terrainSystem;
    if (this.rearWheel.grounded && (this.throttleActive || this.rearWheel.skidding)) {
      window.particleSystem.emitTireSpray(
        this.rearWheel.x,
        this.rearWheel.y + this.rearWheel.radius,
        this.rearWheel.contactNormal.x,
        this.rearWheel.contactNormal.y,
        this.rearWheel.angularVelocity,
        terrain.stageId
      );
    }

    if (this.throttleActive) {
      const exhWorld = this.toWorld(this.def.exhaustOffset.x, this.def.exhaustOffset.y);
      window.particleSystem.emitExhaust(exhWorld.x, exhWorld.y, this.angle, this.vx * 0.3, this.vy * 0.3, 0.7);
    }

    if (this.fuel < 20 && this.fuel > 0) {
      if (Math.floor(Date.now() / 600) % 2 === 0 && !this.lowFuelBeeped) {
        window.soundManager.playLowFuelBeep();
        this.lowFuelBeeped = true;
      } else if (Math.floor(Date.now() / 600) % 2 === 1) {
        this.lowFuelBeeped = false;
      }
    }
  }

  triggerCrash(reason) {
    if (this.crashed) return;
    this.crashed = true;
    this.crashReason = reason;
    this.driverHead.isBroken = true;

    window.soundManager.playCrash();
    window.soundManager.updateEngine(0, false, false);
    window.particleSystem.emitCrashDebris(this.x, this.y);

    if (window.gameInstance) {
      window.gameInstance.onVehicleCrashed(reason);
    }
  }

  updatePostCrash(dt) {
    this.vx *= (1 - 1.2 * dt);
    this.vy += 600 * dt;

    const terrain = window.terrainSystem;
    const gy = terrain.getHeight(this.x);
    if (this.y >= gy - 16) {
      this.y = gy - 16;
      this.vy = 0;
      this.angularVelocity *= 0.8;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.angularVelocity * dt;
  }

  draw(ctx) {
    const vm = window.vehicleManager;

    // 1. Springs
    const rearAnchor = this.toWorld(this.def.rearWheelOffset.x, this.def.rearWheelOffset.y);
    const frontAnchor = this.toWorld(this.def.frontWheelOffset.x, this.def.frontWheelOffset.y);

    vm.drawSpring(ctx, rearAnchor.x, rearAnchor.y, this.rearWheel.x, this.rearWheel.y);
    vm.drawSpring(ctx, frontAnchor.x, frontAnchor.y, this.frontWheel.x, this.frontWheel.y);

    // 2. Wheels
    vm.drawWheel(ctx, this.rearWheel.x, this.rearWheel.y, this.rearWheel.radius, this.rearWheel.angle);
    vm.drawWheel(ctx, this.frontWheel.x, this.frontWheel.y, this.frontWheel.radius, this.frontWheel.angle);

    // 3. Chassis & Driver
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    vm.drawVehicleBody(ctx, this.def, this.driverHead.isBroken, this.driverHead.angle);

    ctx.restore();
  }
}

window.VehiclePhysics = VehiclePhysics;
