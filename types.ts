export type GameState = 'MENU' | 'PLAYING' | 'GAME_OVER';
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export type FishType = 
  | 'CLOWNFISH' 
  | 'SARDINE' 
  | 'TROPICAL' 
  | 'SMALL_OCTOPUS' 
  | 'MEDIUM_FISH' 
  | 'PUFFERFISH' 
  | 'SHARK' 
  | 'SWORDFISH' 
  | 'GIANT_OCTOPUS';

export interface FishSpecies {
  type: FishType;
  minSize: number;
  maxSize: number;
  baseSpeed: number;
  color: string;
  name: string;
  behavior: 'STANDARD' | 'JITTERY' | 'DASHER' | 'AGGRESSIVE';
}

export interface Point {
  x: number;
  y: number;
}

export interface FishEntity {
  id: string;
  species: FishType;
  x: number;
  y: number;
  radius: number;
  targetRadius: number; // For smooth growth animation
  speed: number;
  dx: number;
  dy: number;
  color: string;
  isPlayer: boolean;
  angle: number; // Rotation in radians
  tailWiggle: number; // For animation
  wiggleSpeed: number;
  dashTimer?: number; // For DASHER behavior
}

export interface Bubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  opacity: number;
}