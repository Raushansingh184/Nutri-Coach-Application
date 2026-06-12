export enum Gender {
  Male = 'Male',
  Female = 'Female'
}

export enum ActivityLevel {
  Sedentary = 'Sedentary', // Little or no exercise
  Light = 'Light', // Exercise 1-3 times/week
  Moderate = 'Moderate', // Exercise 4-5 times/week
  Active = 'Active', // Daily exercise or intense exercise 3-4 times/week
  VeryActive = 'VeryActive' // Intense exercise 6-7 times/week
}

export enum Goal {
  LoseWeight = 'Lose Weight',
  Maintain = 'Maintain Weight',
  GainWeight = 'Gain Weight'
}

export type MealCategory = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  targetWeightKg?: number; // Optional specific target
}

export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodItem extends MacroNutrients {
  id: string;
  name: string;
  portion: string;
  timestamp: number;
  isAlcohol: boolean;
  image?: string; // base64
  mealCategory: MealCategory;
}

export interface AlcoholEntry {
  id: string;
  brand: string;
  amount: string;
  timestamp: number;
}

export interface RecipeRecommendation {
  name: string;
  calories: number;
  description: string;
  ingredients: string[];
  reason: string; // Specific reason for this recipe
  tags: string[]; // "Light", "Recovery", "High-Protein", "Skip Meal"
}

export interface PlannedMeal {
  category: MealCategory;
  advice: string; // High level advice e.g. "Skip this meal", "Keep it light"
  suggestions: RecipeRecommendation[];
}

export interface DailyLog {
  date: string; // ISO YYYY-MM-DD
  foods: FoodItem[];
  waterIntakeMl: number;
}

export interface NutritionStats {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  targetCalories: number;
  idealWeightRange: [number, number];
}

export type ViewState = 'onboarding' | 'dashboard' | 'log' | 'plan' | 'profile';