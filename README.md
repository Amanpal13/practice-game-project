# Hill Climb Racing 2D 🏁

A high-fidelity 2D arcade physics driving game inspired by the legendary *Hill Climb Racing*. Built completely from scratch using HTML5 Canvas, Web Audio API, and custom spring-damper vehicle physics — with **zero external dependencies**!

---

## 🚀 How to Play

Open **[http://localhost:8000](http://localhost:8000)** in any web browser.

Alternatively, you can open `index.html` directly in Google Chrome, Safari, Firefox, or Edge.

---

## 🎮 Controls

| Action | Keyboard | Touch / Mouse |
| :--- | :--- | :--- |
| **Accelerate / Tilt Back** | `D` or `Right Arrow` | Tap/Hold **GAS** pedal |
| **Brake / Reverse / Tilt Down** | `A` or `Left Arrow` | Tap/Hold **BRAKE** pedal |
| **Horn** | `Spacebar` | In-game sound |
| **Pause / Resume** | `Escape` or `P` | `⏸️` button |
| **Retry after Crash** | `Spacebar` | **RETRY** button |

---

## ✨ Features

### 1. Authentic 2D Vehicle Physics
- **Dual-Wheel Spring Suspension**: Real-time spring-damper equations calculate shock compression, rebound damping, and chassis weight transfer.
- **Mid-Air Pitch Control**: Applying throttle in mid-air tilts the vehicle backwards (backflip); braking tilts the vehicle forwards (frontflip) to help you land flat on hill slopes!
- **Driver Ragdoll & Neck Break**: The driver sits in the cockpit with an active spring neck that bobs with acceleration. If the driver's head impacts the ground: **"DRIVER DOWN - NECK BROKEN!"**
- **Wheelies & Weight Transfer**: Popping wheelies on steep hills rewards bonus stunt coins.

### 2. Upgrades & Garage
Tune your vehicle across 4 performance categories:
- **⚡ Engine**: Boosts acceleration, horsepower, and climbing torque.
- **🌀 Suspension**: Absorbs massive drops, prevents bottoming out, and keeps tires glued to the terrain.
- **⭕ Tires**: Enhances traction and friction on steep slopes and slippery surfaces.
- **🏎️ 4WD / Power Ratio**: Distributes power between front and rear wheels for maximum hill-climbing ability.

### 3. Unlockable Vehicles
- **Hill Climber (Jeep)**: The classic red 4x4 with balanced handling and roll bar.
- **Monster Truck**: Massive balloon tires, huge suspension travel, and crushing torque.
- **Dune Buggy**: Ultra-lightweight tubular space frame, high top speed, and great air stability.
- **Motocross Bike**: High risk, high reward! Crazy backflips, active driver lean, and extreme agility.

### 4. Diverse Stages & Biomes
- **Countryside**: Rolling green hills, wooden bridges, pine trees, and pleasant sunshine.
- **Desert**: Steep shifting sand dunes, hot sun, and giant jumps.
- **Arctic Snow**: Icy low-friction slopes, falling snowflakes, and glowing northern lights (aurora borealis).
- **Moon**: **Low lunar gravity (0.28g)**, floaty super-jumps, double/triple backflips, and view of planet Earth!

### 5. Procedural Web Audio Engine
- Synthesizes realistic combustion rumble, engine revs pitch-modulated with RPM, tire skidding squeals, coin chimes on a musical pentatonic scale, fuel pickup sloshes, crash booms, and warning alarms.
- Works entirely offline without external audio files!
