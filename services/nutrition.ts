import { UserProfile, Gender, ActivityLevel, Goal, NutritionStats } from '../types';

export const calculateBMI = (weightKg: number, heightCm: number): { value: number; category: string } => {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  
  let category = 'Normal weight';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi >= 25 && bmi < 29.9) category = 'Overweight';
  else if (bmi >= 30) category = 'Obese';

  return { value: parseFloat(bmi.toFixed(1)), category };
};

export const calculateIdealWeightRange = (heightCm: number): [number, number] => {
  const heightM = heightCm / 100;
  // BMI 18.5 to 24.9
  const min = 18.5 * heightM * heightM;
  const max = 24.9 * heightM * heightM;
  return [Math.round(min), Math.round(max)];
};

export const calculateBMR = (user: UserProfile): number => {
  // Mifflin-St Jeor Equation
  const { weightKg, heightCm, age, gender } = user;
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  
  if (gender === Gender.Male) {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  return Math.round(bmr);
};

export const calculateTDEE = (bmr: number, activity: ActivityLevel): number => {
  const multipliers: Record<ActivityLevel, number> = {
    [ActivityLevel.Sedentary]: 1.2,
    [ActivityLevel.Light]: 1.375,
    [ActivityLevel.Moderate]: 1.55,
    [ActivityLevel.Active]: 1.725,
    [ActivityLevel.VeryActive]: 1.9,
  };
  return Math.round(bmr * multipliers[activity]);
};

export const calculateTargetCalories = (tdee: number, goal: Goal): number => {
  switch (goal) {
    case Goal.LoseWeight:
      return Math.round(tdee * 0.8); // 20% deficit
    case Goal.GainWeight:
      return Math.round(tdee * 1.1); // 10% surplus
    default:
      return tdee;
  }
};

export const getNutritionStats = (user: UserProfile): NutritionStats => {
  const bmiData = calculateBMI(user.weightKg, user.heightCm);
  const idealRange = calculateIdealWeightRange(user.heightCm);
  const bmr = calculateBMR(user);
  const tdee = calculateTDEE(bmr, user.activityLevel);
  let targetCalories = calculateTargetCalories(tdee, user.goal);

  // Safety Check: Ensure target calories don't drop below BMR for weight loss
  // BMR is the minimum needed for basic body function.
  if (user.goal === Goal.LoseWeight && targetCalories < bmr) {
    targetCalories = bmr;
  }

  return {
    bmi: bmiData.value,
    bmiCategory: bmiData.category,
    bmr,
    tdee,
    targetCalories,
    idealWeightRange: idealRange
  };
};

// Projection Logic
export const calculateProjection = (
  user: UserProfile,
  dailyCalories: number,
  exerciseMinutes: number,
  exerciseIntensity: 'Low' | 'Medium' | 'High'
) => {
  // 1. Get Base TDEE from User Profile (e.g., Sedentary BMR * 1.2)
  const bmr = calculateBMR(user);
  const baseTDEE = calculateTDEE(bmr, user.activityLevel);

  // 2. Calculate EXTRA calories from specific exercise
  // MET Values approx: Low (Walking) = 3.5, Medium (Jogging) = 6, High (Running) = 10
  const metValues = { 'Low': 3.5, 'Medium': 6.0, 'High': 10.0 };
  const met = metValues[exerciseIntensity];
  
  // Formula: Kcal = MET * Weight(kg) * Duration(hours)
  const exerciseCalories = Math.round(met * user.weightKg * (exerciseMinutes / 60));

  // 3. Total Projected Expenditure
  const projectedTotalExpenditure = baseTDEE + exerciseCalories;
  
  const netDaily = dailyCalories - projectedTotalExpenditure;
  
  // 7700 kcal ~= 1kg
  const dailyWeightChangeKg = netDaily / 7700;
  const weeklyChange = dailyWeightChangeKg * 7;
  
  return {
    weeklyChange: parseFloat(weeklyChange.toFixed(2)),
    dailyDeficitOrSurplus: Math.round(netDaily * -1),
    projectedTDEE: projectedTotalExpenditure,
    exerciseCalories
  };
};