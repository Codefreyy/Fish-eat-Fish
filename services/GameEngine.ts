
import { FishEntity, GameState, Point, Bubble, Difficulty, FishType } from '../types';
import {
  CANVAS_BACKGROUND_BOTTOM,
  CANVAS_BACKGROUND_TOP,
  DIFFICULTY_SETTINGS,
  SPECIES_DATA,
  PLAYER_COLOR,
  PLAYER_INITIAL_RADIUS,
  PLAYER_MAX_SPEED,
  SMOOTH_GROWTH_SPEED,
} from '../constants';
import { SoundManager } from './SoundManager';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  public state: GameState = 'MENU';
  public score: number = 0;
  public highScore: number = 0;
  public difficulty: Difficulty = 'NORMAL';

  private player: FishEntity | null = null;
  private npcs: FishEntity[] = [];
  private bubbles: Bubble[] = [];
  private mousePos: Point = { x: 0, y: 0 };
  
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private soundManager: SoundManager;

  // Callback to update React state
  private onGameOver: (score: number) => void;
  private onScoreUpdate: (score: number) => void;

  constructor(
    canvas: HTMLCanvasElement, 
    soundManager: SoundManager,
    onGameOver: (score: number) => void,
    onScoreUpdate: (score: number) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.soundManager = soundManager;
    this.onGameOver = onGameOver;
    this.onScoreUpdate = onScoreUpdate;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Initialize bubbles for atmosphere
    this.initBubbles();
  }

  public resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  public updateMouse(x: number, y: number) {
    this.mousePos = { x, y };
  }

  public startGame(difficulty: Difficulty) {
    this.difficulty = difficulty;
    this.score = 0;
    this.onScoreUpdate(0);
    this.npcs = [];
    this.state = 'PLAYING';
    
    // Reset Player
    this.player = {
      id: 'player',
      species: 'CLOWNFISH', // Placeholder, visual only for player
      x: this.width / 2,
      y: this.height / 2,
      radius: PLAYER_INITIAL_RADIUS,
      targetRadius: PLAYER_INITIAL_RADIUS,
      speed: 0,
      dx: 0,
      dy: 0,
      color: PLAYER_COLOR,
      isPlayer: true,
      angle: 0,
      tailWiggle: 0,
      wiggleSpeed: 0.2
    };

    // Initial spawn based on difficulty count
    const initialCount = DIFFICULTY_SETTINGS[this.difficulty].npcCount;
    for (let i = 0; i < initialCount; i++) {
      this.spawnNPC(true); // safe spawn away from player
    }

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private initBubbles() {
    this.bubbles = [];
    for(let i=0; i<50; i++) {
        this.bubbles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            radius: Math.random() * 2 + 1,
            speed: Math.random() * 1 + 0.5,
            opacity: Math.random() * 0.5 + 0.1
        });
    }
  }

  private spawnNPC(safeSpawn: boolean = false) {
    const settings = DIFFICULTY_SETTINGS[this.difficulty];
    if (this.npcs.length >= settings.npcCount) return;

    const playerSize = this.player ? this.player.targetRadius : PLAYER_INITIAL_RADIUS;
    const isPredator = Math.random() < settings.predatorChance;

    // Filter available species based on role (Food vs Predator)
    const availableSpecies = Object.values(SPECIES_DATA).filter(s => {
      // If we want a predator, minSize should be roughly bigger than player
      // If food, maxSize should be roughly smaller than player
      // We add some buffer so exact matches aren't impossible
      if (isPredator) {
         return s.minSize > playerSize * 0.8; 
      } else {
         return s.maxSize < playerSize * 1.2;
      }
    });

    // Fallback if no specific role matches (e.g. player is huge, everything is food)
    let speciesData = availableSpecies.length > 0 
        ? availableSpecies[Math.floor(Math.random() * availableSpecies.length)]
        : Object.values(SPECIES_DATA)[Math.floor(Math.random() * Object.values(SPECIES_DATA).length)];

    // If player is super small, force small fish initially
    if (playerSize < 15 && isPredator) {
        // Prevent giant sharks from spawning instantly if player is tiny, unless Hard mode
        if (this.difficulty !== 'HARD' && speciesData.minSize > 50) {
             speciesData = SPECIES_DATA['MEDIUM_FISH']; 
        }
    }

    // Determine Size
    let spawnRadius = 0;
    if (isPredator) {
        // Make it bigger than player
        const minP = Math.max(speciesData.minSize, playerSize * 1.1);
        spawnRadius = minP + Math.random() * (speciesData.maxSize - minP);
    } else {
        // Make it smaller than player
        const maxP = Math.min(speciesData.maxSize, playerSize * 0.9);
        spawnRadius = speciesData.minSize + Math.random() * (maxP - speciesData.minSize);
    }
    
    // Clamp to species limits just in case
    spawnRadius = Math.max(speciesData.minSize, Math.min(speciesData.maxSize, spawnRadius));

    // Position
    let x, y;
    const side = Math.floor(Math.random() * 4); 
    const buffer = spawnRadius * 2;

    if (safeSpawn) {
        x = Math.random() * this.width;
        y = Math.random() * this.height;
        const dx = x - (this.width/2);
        const dy = y - (this.height/2);
        if (Math.sqrt(dx*dx + dy*dy) < 300) { // Larger safe zone
            x = 0; y = 0; 
        }
    } else {
        if (side === 0) { x = Math.random() * this.width; y = -buffer; }
        else if (side === 1) { x = this.width + buffer; y = Math.random() * this.height; }
        else if (side === 2) { x = Math.random() * this.width; y = this.height + buffer; }
        else { x = -buffer; y = Math.random() * this.height; }
    }

    // Velocity
    let speed = speciesData.baseSpeed * settings.speedMultiplier;
    // Slight randomization
    speed *= (0.8 + Math.random() * 0.4);

    let angle = Math.random() * Math.PI * 2;
    if (!safeSpawn) {
        // Bias towards center
        angle = Math.atan2((this.height/2) - y, (this.width/2) - x) + (Math.random() - 0.5);
    }

    this.npcs.push({
      id: Math.random().toString(36).substr(2, 9),
      species: speciesData.type,
      x,
      y,
      radius: spawnRadius,
      targetRadius: spawnRadius,
      speed,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      color: speciesData.color,
      isPlayer: false,
      angle: angle,
      tailWiggle: 0,
      wiggleSpeed: 0.1 + (speed * 0.05),
      dashTimer: 0
    });
  }

  private update(deltaTime: number) {
    if (this.state !== 'PLAYING' || !this.player) return;

    const settings = DIFFICULTY_SETTINGS[this.difficulty];

    // 1. Update Player
    const pdx = this.mousePos.x - this.player.x;
    const pdy = this.mousePos.y - this.player.y;
    const distanceToMouse = Math.sqrt(pdx * pdx + pdy * pdy);
    
    const targetAngle = Math.atan2(pdy, pdx);
    let angleDiff = targetAngle - this.player.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.player.angle += angleDiff * 0.1;

    let targetSpeed = 0;
    if (distanceToMouse > this.player.radius) {
        targetSpeed = Math.min(distanceToMouse * 0.05, PLAYER_MAX_SPEED);
    }
    
    this.player.x += Math.cos(this.player.angle) * targetSpeed;
    this.player.y += Math.sin(this.player.angle) * targetSpeed;
    this.player.speed = targetSpeed;
    this.player.tailWiggle += 0.2 + (targetSpeed * 0.1);

    if (this.player.radius < this.player.targetRadius) {
        this.player.radius += (this.player.targetRadius - this.player.radius) * SMOOTH_GROWTH_SPEED;
    }

    // Bounds
    if (this.player.x < this.player.radius) this.player.x = this.player.radius;
    if (this.player.x > this.width - this.player.radius) this.player.x = this.width - this.player.radius;
    if (this.player.y < this.player.radius) this.player.y = this.player.radius;
    if (this.player.y > this.height - this.player.radius) this.player.y = this.height - this.player.radius;

    // 2. Update NPCs
    this.npcs.forEach(npc => {
        const species = SPECIES_DATA[npc.species];
        
        // Behavior Logic
        if (species.behavior === 'DASHER') {
             // Move fast, stop, move fast
             npc.dashTimer = (npc.dashTimer || 0) + 1;
             if (npc.dashTimer > 120) { // burst every 2 seconds roughly
                 npc.speed = species.baseSpeed * settings.speedMultiplier * 2; // Burst
                 if (npc.dashTimer > 150) npc.dashTimer = 0;
             } else if (npc.dashTimer > 100) {
                 npc.speed = species.baseSpeed * 0.2; // Slow down before burst
             } else {
                 npc.speed = species.baseSpeed * settings.speedMultiplier;
             }
        } else if (species.behavior === 'JITTERY') {
             // Random direction changes frequently
             if (Math.random() < 0.05) {
                 npc.angle += (Math.random() - 0.5) * 1.0;
             }
        } else if (species.behavior === 'AGGRESSIVE') {
             // Turn slightly towards player if close
             const dx = this.player!.x - npc.x;
             const dy = this.player!.y - npc.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist < 400 && npc.radius > this.player!.radius) {
                 const targetA = Math.atan2(dy, dx);
                 let diff = targetA - npc.angle;
                 while (diff > Math.PI) diff -= Math.PI * 2;
                 while (diff < -Math.PI) diff += Math.PI * 2;
                 npc.angle += diff * 0.02; // Slow turn radius
             }
        }

        // Generic Turn randomness from difficulty
        if (Math.random() < settings.turnChance) {
             npc.angle += (Math.random() - 0.5);
        }

        // Update vectors based on current angle/speed
        npc.dx = Math.cos(npc.angle) * npc.speed;
        npc.dy = Math.sin(npc.angle) * npc.speed;

        npc.x += npc.dx;
        npc.y += npc.dy;
        npc.tailWiggle += npc.wiggleSpeed;
        
        // Bounce Logic
        const margin = -npc.radius * 2;
        if (npc.x < margin || npc.x > this.width - margin) {
            npc.dx *= -1;
            npc.angle = Math.atan2(npc.dy, npc.dx);
            npc.x += npc.dx * 2;
        }
        if (npc.y < margin || npc.y > this.height - margin) {
            npc.dy *= -1;
            npc.angle = Math.atan2(npc.dy, npc.dx);
            npc.y += npc.dy * 2;
        }
    });

    // 3. Collision
    for (let i = this.npcs.length - 1; i >= 0; i--) {
        const npc = this.npcs[i];
        const dx = this.player.x - npc.x;
        const dy = this.player.y - npc.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Hitbox calculation
        if (dist < (this.player.radius * 0.7 + npc.radius * 0.7)) { // slightly more forgiving
            if (this.player.radius >= npc.radius) {
                // EAT
                this.soundManager.playEat();
                this.npcs.splice(i, 1);
                // Difficulty affects growth
                const growthAmount = (npc.radius * 0.2) * settings.growthMultiplier;
                this.player.targetRadius += growthAmount;
                this.score += Math.floor(npc.radius * 10);
                this.onScoreUpdate(this.score);
            } else {
                // DIE
                this.endGame();
            }
        }
    }

    // 4. Bubbles
    this.bubbles.forEach(b => {
        b.y -= b.speed;
        b.x += Math.sin(b.y * 0.02) * 0.5;
        if (b.y < -10) {
            b.y = this.height + 10;
            b.x = Math.random() * this.width;
        }
    });

    // 5. Spawning
    if (Date.now() - this.spawnTimer > 1000) {
        if (this.npcs.length < settings.npcCount) {
            // Chance to spawn based on missing count
            if (Math.random() < 0.6) { 
                this.spawnNPC();
            }
        }
        this.spawnTimer = Date.now();
    }
  }

  private draw() {
    this.ctx.fillStyle = CANVAS_BACKGROUND_TOP;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, CANVAS_BACKGROUND_TOP);
    gradient.addColorStop(1, CANVAS_BACKGROUND_BOTTOM);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.bubbles.forEach(b => {
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`;
        this.ctx.fill();
    });
    this.ctx.restore();

    // Sort by radius for simple z-indexing (small below big)
    this.npcs.sort((a,b) => a.radius - b.radius);
    
    this.npcs.forEach(npc => this.drawFish(npc));
    
    if (this.player) {
        this.drawFish(this.player);
    }
  }

  private drawFish(fish: FishEntity) {
    this.ctx.save();
    this.ctx.translate(fish.x, fish.y);
    
    // Flip if moving left
    const isLeft = Math.abs(fish.angle) > Math.PI / 2;
    if (isLeft) {
        this.ctx.scale(1, -1);
        this.ctx.rotate(-fish.angle);
    } else {
        this.ctx.rotate(fish.angle);
    }
    
    const r = fish.radius;

    // --- RENDER BASED ON SPECIES ---
    if (fish.species === 'SHARK') {
        this.drawShark(fish, r);
    } else if (fish.species === 'SMALL_OCTOPUS' || fish.species === 'GIANT_OCTOPUS') {
        this.drawOctopus(fish, r);
    } else if (fish.species === 'SWORDFISH') {
        this.drawSwordfish(fish, r);
    } else if (fish.species === 'PUFFERFISH') {
        this.drawPuffer(fish, r);
    } else {
        this.drawStandardFish(fish, r);
    }

    // Player Highlight
    if (fish.isPlayer) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    this.ctx.restore();
  }

  // --- Specialized Draw Functions ---

  private drawStandardFish(fish: FishEntity, r: number) {
    // Tail
    const tailWiggle = Math.sin(fish.tailWiggle) * (r * 0.2);
    this.ctx.fillStyle = fish.color;
    this.ctx.beginPath();
    this.ctx.moveTo(-r * 0.8, 0);
    this.ctx.lineTo(-r * 1.6, -r * 0.6 + tailWiggle);
    this.ctx.lineTo(-r * 1.6, r * 0.6 + tailWiggle);
    this.ctx.closePath();
    this.ctx.fill();

    // Body
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Stripes for clownfish
    if (fish.species === 'CLOWNFISH') {
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.rect(-r*0.2, -r*0.5, r*0.3, r);
        this.ctx.rect(-r*0.7, -r*0.4, r*0.2, r*0.8);
        this.ctx.fill();
    }

    // Eye
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(r * 0.4, -r * 0.15, r * 0.25, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(r * 0.5, -r * 0.15, r * 0.1, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawShark(fish: FishEntity, r: number) {
    const tailWiggle = Math.sin(fish.tailWiggle) * (r * 0.2);
    this.ctx.fillStyle = fish.color;
    
    // Tail
    this.ctx.beginPath();
    this.ctx.moveTo(-r, 0);
    this.ctx.lineTo(-r * 2.2, -r * 0.8 + tailWiggle);
    this.ctx.lineTo(-r * 2.2, r * 0.8 + tailWiggle);
    this.ctx.lineTo(-r * 1.8, 0 + tailWiggle);
    this.ctx.fill();

    // Dorsal Fin
    this.ctx.beginPath();
    this.ctx.moveTo(-r * 0.2, -r * 0.4);
    this.ctx.lineTo(r * 0.2, -r * 1.2);
    this.ctx.lineTo(r * 0.6, -r * 0.4);
    this.ctx.fill();

    // Body (longer)
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, r * 1.4, r * 0.55, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Eye (Angry)
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(r * 0.8, -r * 0.1, r * 0.15, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(r * 0.85, -r * 0.1, r * 0.05, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawOctopus(fish: FishEntity, r: number) {
    this.ctx.fillStyle = fish.color;
    
    // Head
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
    this.ctx.fill();

    // Legs
    this.ctx.strokeStyle = fish.color;
    this.ctx.lineWidth = r * 0.2;
    this.ctx.lineCap = 'round';
    
    for(let i=0; i<4; i++) {
        const legOffset = (i / 4) * Math.PI + Math.PI/2; // Bottom half
        const wiggle = Math.sin(fish.tailWiggle + i) * (r * 0.4);
        this.ctx.beginPath();
        this.ctx.moveTo(Math.cos(legOffset)*r*0.5, Math.sin(legOffset)*r*0.5);
        this.ctx.quadraticCurveTo(
            Math.cos(legOffset)*r*1.5 + wiggle, 
            Math.sin(legOffset)*r*1.5, 
            Math.cos(legOffset)*r*2, 
            Math.sin(legOffset)*r*2 + wiggle
        );
        this.ctx.stroke();
    }

    // Eyes
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(-r * 0.2, -r * 0.1, r * 0.25, 0, Math.PI * 2);
    this.ctx.arc(r * 0.2, -r * 0.1, r * 0.25, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(-r * 0.2, -r * 0.1, r * 0.1, 0, Math.PI * 2);
    this.ctx.arc(r * 0.2, -r * 0.1, r * 0.1, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawSwordfish(fish: FishEntity, r: number) {
    const tailWiggle = Math.sin(fish.tailWiggle) * (r * 0.2);
    this.ctx.fillStyle = fish.color;

    // Tail
    this.ctx.beginPath();
    this.ctx.moveTo(-r, 0);
    this.ctx.lineTo(-r * 1.8, -r * 0.6 + tailWiggle);
    this.ctx.lineTo(-r * 1.8, r * 0.6 + tailWiggle);
    this.ctx.fill();

    // Body
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, r * 1.2, r * 0.4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Sword
    this.ctx.fillStyle = '#cbd5e1'; // lighter sword
    this.ctx.beginPath();
    this.ctx.moveTo(r, 0);
    this.ctx.lineTo(r * 2.5, 0); // Very long nose
    this.ctx.lineWidth = r * 0.1;
    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.stroke();

    // Eye
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(r * 0.5, -r * 0.1, r * 0.2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(r * 0.55, -r * 0.1, r * 0.1, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawPuffer(fish: FishEntity, r: number) {
    this.ctx.fillStyle = fish.color;
    
    // Body (Rounder)
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r, 0, Math.PI * 2);
    this.ctx.fill();

    // Spikes (Visual only)
    this.ctx.strokeStyle = '#fef08a';
    this.ctx.lineWidth = 2;
    for(let i=0; i<8; i++) {
        const ang = (i/8) * Math.PI * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(Math.cos(ang)*r, Math.sin(ang)*r);
        this.ctx.lineTo(Math.cos(ang)*r*1.3, Math.sin(ang)*r*1.3);
        this.ctx.stroke();
    }

    // Small Fins
    const tailWiggle = Math.sin(fish.tailWiggle) * (r * 0.2);
    this.ctx.beginPath();
    this.ctx.moveTo(-r, 0);
    this.ctx.lineTo(-r*1.4, -r*0.3 + tailWiggle);
    this.ctx.lineTo(-r*1.4, r*0.3 + tailWiggle);
    this.ctx.fill();

    // Eyes (Derpy)
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(r * 0.3, -r * 0.3, r * 0.2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(r * 0.35, -r * 0.3, r * 0.08, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private endGame() {
    this.soundManager.playGameOver();
    this.state = 'GAME_OVER';
    if (this.score > this.highScore) {
        this.highScore = this.score;
    }
    this.onGameOver(this.score);
  }

  public loop = (timestamp: number) => {
    if (this.state !== 'PLAYING') {
           if (this.state === 'MENU') {
                this.updateMenuBackground();
                this.draw();
                requestAnimationFrame(this.loop);
           }
        return;
    }

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.draw();

    requestAnimationFrame(this.loop);
  };

  private updateMenuBackground() {
      this.bubbles.forEach(b => {
        b.y -= b.speed;
        b.x += Math.sin(b.y * 0.02) * 0.5;
        if (b.y < -10) {
            b.y = this.height + 10;
            b.x = Math.random() * this.width;
        }
      });
      this.ctx.fillStyle = CANVAS_BACKGROUND_TOP;
      this.ctx.fillRect(0, 0, this.width, this.height);
      const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
      gradient.addColorStop(0, CANVAS_BACKGROUND_TOP);
      gradient.addColorStop(1, CANVAS_BACKGROUND_BOTTOM);
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      this.ctx.save();
      this.bubbles.forEach(b => {
          this.ctx.beginPath();
          this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          this.ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`;
          this.ctx.fill();
      });
      this.ctx.restore();
  }

  public stop() {
    this.state = 'MENU';
    this.soundManager.stopBgm(); // Stop ambient on menu if desired, but we will likely keep it
  }
}
