import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem, RecipeRecommendation, UserProfile, DailyLog, MealCategory, PlannedMeal, AlcoholEntry } from "../types";

// NOTE: In a real production app, this should be proxied through a backend.
// For this demo, we assume the key is available in process.env.
// The key's availability is handled externally and is a hard requirement.

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MOCK_FOOD_RESPONSE = {
  identified: true,
  items: [
    { name: "Grilled Chicken Breast", calories: 280, protein: 50, carbs: 0, fat: 6, portion: "1 breast (200g)" },
    { name: "Steamed Broccoli", calories: 55, protein: 4, carbs: 11, fat: 0.6, portion: "1 cup" },
    { name: "Brown Rice", calories: 216, protein: 5, carbs: 45, fat: 1.8, portion: "1 cup" }
  ]
};

const MOCK_MEAL_PLAN: PlannedMeal[] = [
  {
    category: 'Lunch',
    advice: "Keep it light to balance your morning calories.",
    suggestions: [
      { 
        name: "Greek Yogurt Bowl", 
        calories: 250, 
        ingredients: ["Greek Yogurt", "Berries", "Honey"], 
        description: "Mix yogurt with berries and a drizzle of honey.", 
        reason: "High protein, low fat to compensate for earlier meal.",
        tags: ["Light", "High-Protein"]
      }
    ]
  },
  {
    category: 'Snack',
    advice: "Optional hydration or small bite.",
    suggestions: [
       { 
        name: "Green Tea & Almonds", 
        calories: 100, 
        ingredients: ["Green Tea", "10 Almonds"], 
        description: "Antioxidant rich tea with healthy fats.", 
        reason: "Satiety without heaviness.",
        tags: ["Snack"]
      }
    ]
  },
  {
    category: 'Dinner',
    advice: "Balanced recovery meal.",
    suggestions: [
       { 
        name: "Grilled Fish Tacos", 
        calories: 400, 
        ingredients: ["White Fish", "Corn Tortilla", "Cabbage Slaw"], 
        description: "Grill fish and serve in tortillas with fresh slaw.", 
        reason: "Balanced lean protein and carbs.",
        tags: ["Balanced"]
      }
    ]
  }
];

export const analyzeFoodImage = async (base64Image: string): Promise<Partial<FoodItem>[]> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key provided. Using mock data.");
    await new Promise(r => setTimeout(r, 1500));
    return MOCK_FOOD_RESPONSE.items.map(i => ({
      ...i,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      isAlcohol: false
    }));
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Identify the food items in this image. Estimate calories and macros (protein, carbs, fat) per serving seen. Return a JSON list." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  calories: { type: Type.NUMBER },
                  protein: { type: Type.NUMBER },
                  carbs: { type: Type.NUMBER },
                  fat: { type: Type.NUMBER },
                  portion: { type: Type.STRING },
                  isAlcohol: { type: Type.BOOLEAN }
                },
                required: ["name", "calories", "protein", "carbs", "fat", "portion"]
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return (result.items || []).map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      isAlcohol: item.isAlcohol || false
    }));

  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to analyze image. Please try again.");
  }
};

export const estimateNutrition = async (foodName: string, quantity: string): Promise<{ calories: number, protein: number, carbs: number, fat: number }> => {
  if (!process.env.API_KEY) {
     return { calories: 150, protein: 10, carbs: 20, fat: 5 }; // Mock
  }
  
  const prompt = `Calculate nutrition for: "${quantity} of ${foodName}". Return JSON with estimated values.`;
  
  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
          }
        }
      }
    });
    const data = JSON.parse(response.text || "{}");
    return {
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0
    };
  } catch (error) {
    console.error("Estimation error", error);
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
};

export const generateMealPlan = async (
  user: UserProfile, 
  currentLog: DailyLog, 
  remainingCalories: number,
  recentHistory: DailyLog[], // NEW: Past days
  alcoholContext?: AlcoholEntry
): Promise<PlannedMeal[]> => {
  if (!process.env.API_KEY) {
    return MOCK_MEAL_PLAN;
  }

  // 1. Determine what has been eaten
  const foods = currentLog.foods;
  const eatenCategories = new Set(foods.map(f => f.mealCategory));
  
  // 2. Determine remaining categories in order
  const allCategories: MealCategory[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
  let remainingCategories: MealCategory[] = [];

  // Logic: Find the last eaten category index, suggest everything after it.
  // If nothing eaten, suggest all.
  if (foods.length === 0) {
    remainingCategories = allCategories;
  } else {
    // Check specific slots. If Breakfast is eaten, remove it.
    remainingCategories = allCategories.filter(cat => !eatenCategories.has(cat));
    
    // Heuristic: only show future meals
    const lastLogTime = Math.max(...foods.map(f => f.timestamp), 0);
    const lastCategory = foods.find(f => f.timestamp === lastLogTime)?.mealCategory;
    
    if (lastCategory) {
       const idx = allCategories.indexOf(lastCategory);
       if (idx !== -1) {
         // Only show categories coming AFTER the last logged meal
         remainingCategories = allCategories.slice(idx + 1);
       }
    }
  }

  if (remainingCategories.length === 0) {
    return []; // Day complete
  }

  // Calculate intake context for today
  const intakeByCategory: Record<string, number> = { Breakfast: 0, Lunch: 0, Snack: 0, Dinner: 0 };
  foods.forEach(f => {
    if (f.mealCategory) {
      intakeByCategory[f.mealCategory] = (intakeByCategory[f.mealCategory] || 0) + f.calories;
    }
  });
  
  const consumedStr = foods.map(f => `${f.name} (${f.calories}kcal, ${f.mealCategory})`).join(", ");

  // Summarize History
  const historyStr = recentHistory.map(h => {
    const totalCals = h.foods.reduce((sum, f) => sum + f.calories, 0);
    const topFoods = h.foods.slice(0, 5).map(f => f.name).join(", ");
    return `- Date ${h.date}: ${totalCals}kcal. Foods: ${topFoods}`;
  }).join("\n");

  let systemInstruction = `
    User: ${user.gender}, ${user.age}yo, Goal: ${user.goal}.
    Consumed today: ${consumedStr || "Nothing yet"}.
    Remaining Budget: ${remainingCalories} kcal.
    
    RECENT HISTORY (Past 3 Days):
    ${historyStr || "No recent history."}
    
    Task: Create a meal plan for the *remaining* meals: ${remainingCategories.join(', ')}.
    
    Rules:
    1. Analyze heaviness of previous meals TODAY.
    2. Analyze RECENT HISTORY. If user ate a lot of heavy food/carbs in past days, suggest fiber-rich, lighter, gut-healing foods today.
    3. If user lacks variety in history (e.g. only chicken), suggest diverse proteins or veggies.
    4. Provide 'advice' and 2-3 'suggestions' for each category.
  `;

  if (alcoholContext) {
    // Determine days since drinking
    const now = Date.now();
    const diffMs = now - alcoholContext.timestamp;
    const daysSince = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1; // 1 = First day after, 2 = Second day, etc.

    systemInstruction += `
      CRITICAL CONTEXT: User consumed alcohol ~${daysSince} day(s) ago.
      Alcohol Details: ${alcoholContext.brand}, Amount: ${alcoholContext.amount}.
      
      RECOVERY MODE ACTIVE (Day ${daysSince} of 3):
      
      IF Day 1 (Acute Hangover / Immediate Aftermath):
        - Prioritize HANGOVER CURE foods: Electrolytes (Sodium, Potassium), Ginger (nausea), Eggs (cysteine), Bananas, Oatmeal.
        - STRICTLY AVOID heavy grease/fried foods.
        - Focus on hydration.
        
      IF Day 2 (Replenishment):
        - Focus on B-Vitamins and Antioxidants (Leafy greens, berries, lean protein) to support liver.
        - Return to healthy caloric balance.
        
      IF Day 3 (Normalization):
        - Stabilization. Return to standard healthy diet but ensure good hydration.
        
      Adjust the "Advice" and "Recipes" specifically for Day ${daysSince} recovery needs.
    `;
  }

  const prompt = systemInstruction + `
    Return JSON: { meals: [ { category, advice, suggestions: [ {name, calories, ingredients, description, reason, tags} ] } ] }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  advice: { type: Type.STRING },
                  suggestions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        calories: { type: Type.NUMBER },
                        ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                        description: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result.meals || [];
  } catch (error) {
    console.error("Gemini Plan Error:", error);
    return MOCK_MEAL_PLAN.filter(p => remainingCategories.includes(p.category));
  }
};