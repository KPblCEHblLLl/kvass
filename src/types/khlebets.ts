export enum Oven {
  Mine = 'Mine',
}

export enum FlowerType {
  Rye2000 = 'Rye2000',
}

export interface BakingStep {
  temperature: number;
  duration: number;
  fan: boolean;
}

export interface Khlebets {
  iteration: number;
  oven: Oven;
  perBake: number;
  flower: number;
  flowerType: FlowerType;
  water: number;
  sugar?: number;
  isSnack: boolean;
  sesame?: number;
  sunflower?: number;
  flax?: number;
  baking: BakingStep[];
}

export type KhlebetsData = Khlebets[];
