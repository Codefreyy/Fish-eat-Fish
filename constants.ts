import { Difficulty, FishSpecies, FishType } from './types';

export const CANVAS_BACKGROUND_TOP = '#006994'; // Deep Ocean Blue
export const CANVAS_BACKGROUND_BOTTOM = '#001e36'; // Darker Abyss

export const PLAYER_INITIAL_RADIUS = 12;
export const PLAYER_MAX_SPEED = 5;
export const PLAYER_COLOR = '#fbbf24'; // Amber-400 (Goldfish)

export const SPAWN_INTERVAL_MS = 1000; 

// Difficulty Settings
export const DIFFICULTY_SETTINGS: Record<Difficulty, {
  npcCount: number;
  predatorChance: number; // 0 to 1, chance of spawning a fish larger than player
  growthMultiplier: number; // How fast player grows
  speedMultiplier: number; // NPC speed modifier
  turnChance: number; // Probability per frame of changing direction
}> = {
  EASY: {
    npcCount: 40,
    predatorChance: 0.15,
    growthMultiplier: 1.5,
    speedMultiplier: 0.7,
    turnChance: 0.005,
  },
  NORMAL: {
    npcCount: 25,
    predatorChance: 0.4,
    growthMultiplier: 1.0,
    speedMultiplier: 1.0,
    turnChance: 0.01,
  },
  HARD: {
    npcCount: 15,
    predatorChance: 0.7,
    growthMultiplier: 0.7,
    speedMultiplier: 1.4,
    turnChance: 0.04,
  }
};

export const SMOOTH_GROWTH_SPEED = 0.05;

// Fish Species Data
export const SPECIES_DATA: Record<FishType, FishSpecies> = {
  CLOWNFISH: { 
    type: 'CLOWNFISH', 
    minSize: 8, 
    maxSize: 14, 
    baseSpeed: 1.5, 
    color: '#f97316', 
    name: 'Clownfish', 
    behavior: 'STANDARD' 
  },
  SARDINE: { 
    type: 'SARDINE', 
    minSize: 4, 
    maxSize: 8, 
    baseSpeed: 2.0, 
    color: '#94a3b8', 
    name: 'Sardine', 
    behavior: 'STANDARD' 
  },
  TROPICAL: { 
    type: 'TROPICAL', 
    minSize: 10, 
    maxSize: 18, 
    baseSpeed: 1.2, 
    color: '#d946ef', 
    name: 'Tropical', 
    behavior: 'STANDARD' 
  },
  SMALL_OCTOPUS: { 
    type: 'SMALL_OCTOPUS', 
    minSize: 12, 
    maxSize: 20, 
    baseSpeed: 1.0, 
    color: '#fb7185', 
    name: 'Small Octopus', 
    behavior: 'JITTERY' 
  },
  MEDIUM_FISH: { 
    type: 'MEDIUM_FISH', 
    minSize: 22, 
    maxSize: 45, 
    baseSpeed: 1.3, 
    color: '#60a5fa', 
    name: 'Sea Fish', 
    behavior: 'STANDARD' 
  },
  PUFFERFISH: { 
    type: 'PUFFERFISH', 
    minSize: 25, 
    maxSize: 40, 
    baseSpeed: 1.1, 
    color: '#facc15', 
    name: 'Pufferfish', 
    behavior: 'STANDARD' 
  },
  SHARK: { 
    type: 'SHARK', 
    minSize: 55, 
    maxSize: 120, 
    baseSpeed: 2.5, 
    color: '#475569', 
    name: 'Shark', 
    behavior: 'AGGRESSIVE' 
  },
  SWORDFISH: { 
    type: 'SWORDFISH', 
    minSize: 45, 
    maxSize: 90, 
    baseSpeed: 3.5, 
    color: '#1e40af', 
    name: 'Swordfish', 
    behavior: 'DASHER' 
  },
  GIANT_OCTOPUS: { 
    type: 'GIANT_OCTOPUS', 
    minSize: 80, 
    maxSize: 200, 
    baseSpeed: 0.6, 
    color: '#7e22ce', 
    name: 'Giant Octopus', 
    behavior: 'JITTERY' 
  },
};