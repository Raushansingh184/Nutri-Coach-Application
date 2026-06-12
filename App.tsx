import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Utensils, Camera, User, ChevronRight, ChevronLeft,
  TrendingUp, AlertCircle, Droplet, Plus, Trash2, X,
  Info, Clock, Coffee, Sun, Moon, CheckCircle, Wine, Beer, Power, Calendar, Sparkles, Wand2, RefreshCw,
  AlertTriangle, Flame
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell, LineChart, Line, CartesianGrid, ReferenceLine
} from 'recharts';

import { UserProfile, Gender, ActivityLevel, Goal, DailyLog, FoodItem, ViewState, NutritionStats, RecipeRecommendation, MealCategory, PlannedMeal, AlcoholEntry } from './types';
import { getNutritionStats, calculateProjection, calculateTDEE, calculateBMR, calculateTargetCalories } from './services/nutrition';
import { analyzeFoodImage, generateMealPlan, estimateNutrition } from './services/gemini';

// --- Components ---

const Disclaimer = () => (
  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-r shadow-sm">
    <div className="flex">
      <div className="flex-shrink-0">
        <AlertCircle className="h-5 w-5 text-amber-500" aria-hidden="true" />
      </div>
      <div className="ml-3">
        <p className="text-xs text-amber-700">
          <strong>Medical Disclaimer:</strong> This app provides estimates for informational purposes only. 
          It is not a substitute for professional medical advice, diagnosis, or treatment. 
          Always seek the advice of your physician.
        </p>
      </div>
    </div>
  </div>
);

const CameraModal = ({ isOpen, onClose, onCapture }: { isOpen: boolean, onClose: () => void, onCapture: (base64: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error("Camera access error:", err);
      setError('Could not access camera. Please check permissions or use file upload.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        onCapture(base64);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 w-full z-10">
         <h3 className="text-white font-bold">Take Photo</h3>
         <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white"><X className="w-6 h-6" /></button>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-black relative">
        {error ? (
          <div className="text-white text-center p-6">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p>{error}</p>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="p-8 bg-black/50 flex justify-center pb-12">
        <button 
          onClick={capturePhoto} 
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:bg-white/50 transition-colors"
        >
          <div className="w-16 h-16 bg-white rounded-full"></div>
        </button>
      </div>
    </div>
  );
};

const Onboarding = ({ onComplete }: { onComplete: (profile: UserProfile) => void }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<UserProfile>>({
    name: '',
    gender: Gender.Female,
    activityLevel: ActivityLevel.Sedentary, // Default
    goal: Goal.LoseWeight
  });

  const handleChange = (field: keyof UserProfile, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(s => s + 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.name && data.age && data.heightCm && data.weightKg) {
      onComplete(data as UserProfile);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col justify-center max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-2">Welcome to NutriCoach</h1>
      <p className="text-slate-500 mb-8">Let's build your personalized nutrition plan.</p>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-xl space-y-6">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
            <h2 className="text-xl font-semibold">About You</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700">What should we call you?</label>
              <input 
                type="text" 
                required
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3 bg-slate-50"
                value={data.name || ''}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Your Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Gender</label>
              <div className="flex space-x-4 mt-2">
                {[Gender.Male, Gender.Female].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleChange('gender', g)}
                    className={`flex-1 py-3 rounded-lg border ${data.gender === g ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Age</label>
              <input 
                type="number" 
                required
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3 bg-slate-50"
                value={data.age || ''}
                onChange={e => handleChange('age', Number(e.target.value))}
              />
            </div>
            <button type="button" onClick={nextStep} disabled={!data.name} className="w-full bg-slate-900 text-white py-3 rounded-xl mt-4 font-semibold disabled:opacity-50">Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
            <h2 className="text-xl font-semibold">Lifestyle & Body</h2>
             <div>
              <label className="block text-sm font-medium text-slate-700">Base Activity Level</label>
              <select 
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3 bg-slate-50"
                value={data.activityLevel}
                onChange={e => handleChange('activityLevel', e.target.value)}
              >
                {Object.values(ActivityLevel).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700">Height (cm)</label>
              <input 
                type="number" 
                required
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3 bg-slate-50"
                value={data.heightCm || ''}
                onChange={e => handleChange('heightCm', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Current Weight (kg)</label>
              <input 
                type="number" 
                required
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3 bg-slate-50"
                value={data.weightKg || ''}
                onChange={e => handleChange('weightKg', Number(e.target.value))}
              />
            </div>
             <button type="button" onClick={nextStep} className="w-full bg-slate-900 text-white py-3 rounded-xl mt-4 font-semibold">Next</button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
            <h2 className="text-xl font-semibold">Goal Setting</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700">Goal</label>
              <select 
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3 bg-slate-50"
                value={data.goal}
                onChange={e => handleChange('goal', e.target.value)}
              >
                {Object.values(Goal).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Target Weight (kg)</label>
              <input 
                type="number" 
                required
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-3 bg-slate-50"
                value={data.targetWeightKg || ''}
                onChange={e => handleChange('targetWeightKg', Number(e.target.value))}
              />
              <p className="text-xs text-slate-400 mt-1">We'll use this to track your progress timeline.</p>
            </div>
            <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl mt-4 font-semibold shadow-lg shadow-primary/30">Get Started</button>
          </div>
        )}
      </form>
      <div className="mt-8">
        <Disclaimer />
      </div>
    </div>
  );
};

const Dashboard = ({ user, stats, log }: { user: UserProfile, stats: NutritionStats, log: DailyLog }) => {
  const consumedCalories = log.foods.reduce((sum, item) => sum + item.calories, 0);
  const remaining = stats.targetCalories - consumedCalories;
  const progress = Math.min(100, (consumedCalories / stats.targetCalories) * 100);

  // Projection Logic State
  const [projScenario, setProjScenario] = useState<{
    cals: number | string, 
    minutes: number,
    intensity: 'Low' | 'Medium' | 'High'
  }>({
    cals: stats.targetCalories,
    minutes: 0,
    intensity: 'Medium'
  });

  const validCals = projScenario.cals === '' ? 0 : Number(projScenario.cals);

  // New Projection Function Signature
  const projection = calculateProjection(user, validCals, projScenario.minutes, projScenario.intensity);

  // Calculate Chart Data for Projection
  const chartData = [];
  let currentWeight = user.weightKg;
  const targetWeight = user.targetWeightKg || (stats.idealWeightRange[0] + stats.idealWeightRange[1]) / 2;
  
  for (let i = 0; i <= 24; i++) { // 24 weeks projection
    chartData.push({ name: `W${i}`, weight: parseFloat(currentWeight.toFixed(1)) });
    currentWeight += projection.weeklyChange;
  }

  const weeksToGoal = projection.weeklyChange !== 0 
    ? Math.abs((user.weightKg - targetWeight) / projection.weeklyChange) 
    : 0;
  
  const isLoss = projection.weeklyChange < 0;
  const isDangerousLow = validCals < stats.bmr;

  // Handle number input changes nicely
  const handleIntChange = (val: string, field: 'cals') => {
    if (val === '') {
      setProjScenario(prev => ({ ...prev, [field]: '' }));
    } else {
      const num = parseInt(val, 10);
      if (!isNaN(num)) {
        setProjScenario(prev => ({ ...prev, [field]: num }));
      }
    }
  };

  // Auto-Update Intake when Exercise changes
  const updateRecommendedIntake = (mins: number, intensity: 'Low' | 'Medium' | 'High') => {
    // 1. Get Base TDEE
    const bmr = calculateBMR(user);
    const baseTDEE = calculateTDEE(bmr, user.activityLevel);

    // 2. Calc Extra Burn
    const metValues = { 'Low': 3.5, 'Medium': 6.0, 'High': 10.0 };
    const extraBurn = Math.round(metValues[intensity] * user.weightKg * (mins / 60));

    // 3. New Total Expenditure
    const totalExpenditure = baseTDEE + extraBurn;

    // 4. Apply Goal Modifier
    let newRecommended = calculateTargetCalories(totalExpenditure, user.goal);

    // Safety
    if (user.goal === Goal.LoseWeight && newRecommended < bmr) {
      newRecommended = bmr;
    }

    setProjScenario(prev => ({
        ...prev,
        minutes: mins,
        intensity: intensity,
        cals: newRecommended
    }));
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header Stats */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-slate-500 text-sm font-medium">Daily Budget</p>
            <h2 className="text-3xl font-bold text-slate-900">{remaining} <span className="text-sm font-normal text-slate-400">kcal left</span></h2>
          </div>
          <div className="text-right">
             <div className={`text-sm font-bold px-3 py-1 rounded-full ${stats.bmiCategory === 'Normal weight' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              BMI: {stats.bmi}
             </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${progress > 100 ? 'bg-danger' : 'bg-primary'}`} 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>0 kcal</span>
          <span>{stats.targetCalories} kcal</span>
        </div>
      </div>

      {/* Projection Tool */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-secondary" /> 
          Time to Goal Projection
        </h3>
        
        <div className="space-y-6">
            {/* Exercise Duration Slider */}
            <div>
               <div className="flex justify-between items-center mb-2">
                 <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Daily Exercise</label>
                 <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{projScenario.minutes} min</span>
               </div>
               <input 
                  type="range" 
                  min="0" max="120" step="5"
                  value={projScenario.minutes}
                  onChange={(e) => updateRecommendedIntake(Number(e.target.value), projScenario.intensity)}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-secondary"
               />
            </div>

            {/* Exercise Intensity Buttons */}
            <div>
               <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block">Intensity</label>
               <div className="flex gap-2">
                 {(['Low', 'Medium', 'High'] as const).map((lvl) => (
                   <button 
                    key={lvl}
                    onClick={() => updateRecommendedIntake(projScenario.minutes, lvl)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${
                      projScenario.intensity === lvl 
                        ? 'bg-secondary/10 border-secondary text-secondary' 
                        : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                    }`}
                   >
                     {lvl}
                   </button>
                 ))}
               </div>
               <p className="text-[10px] text-slate-400 mt-2 text-center">
                 burning ~{projection.exerciseCalories} kcal extra
               </p>
            </div>

            {/* Calorie Slider & Input */}
            <div className="space-y-2 pt-4 border-t border-slate-50">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Planned Daily Intake</label>
                <div className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                  <input 
                    type="number" 
                    value={projScenario.cals}
                    onChange={(e) => handleIntChange(e.target.value, 'cals')}
                    className={`w-16 bg-transparent text-right font-bold outline-none ${isDangerousLow ? 'text-red-600' : 'text-slate-700'}`}
                  />
                  <span className="text-xs text-slate-400">kcal</span>
                </div>
              </div>
              
              <input 
                type="range" 
                min="1000" max="4000" step="50"
                value={validCals}
                onChange={(e) => setProjScenario(p => ({...p, cals: Number(e.target.value)}))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isDangerousLow ? 'bg-red-100 accent-red-500' : 'bg-slate-100 accent-primary'}`}
              />

              {/* DANGER WARNING */}
              {isDangerousLow && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-700 mb-1">Low Energy Warning</p>
                    <p className="text-[11px] text-red-600 leading-tight">
                      This is below your BMR ({stats.bmr} kcal). You may feel <strong>less energetic</strong>, <strong>less active</strong>, 
                      and this is <strong>not a recommended way</strong> to lose weight.
                    </p>
                  </div>
                </div>
              )}
              
              {!isDangerousLow && (
                 <p className="text-[10px] text-slate-400 text-center">
                  Min recommended for body function (BMR): {stats.bmr} kcal
                 </p>
              )}
            </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-600 mb-4 text-center">
            Result: <span className={isLoss ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
              {isLoss ? "Lose" : "Gain"} {Math.abs(projection.weeklyChange)} kg/week
            </span>
            {isLoss && weeksToGoal > 0 && weeksToGoal < 100 && (
              <span className="block text-xs text-slate-400 mt-1">
                 ~{Math.round(weeksToGoal)} weeks to reach {targetWeight.toFixed(1)}kg
              </span>
            )}
          </p>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  labelStyle={{ color: '#64748b', fontSize: '12px' }}
                />
                <ReferenceLine y={targetWeight} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Goal', position: 'right', fill: '#10b981', fontSize: 10 }} />
                <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <Disclaimer />
    </div>
  );
};

const AlcoholModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (entry: AlcoholEntry) => void }) => {
  const [brand, setBrand] = useState('');
  const [amount, setAmount] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start">
          <div>
             <div className="bg-indigo-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-indigo-600">
                <Wine className="w-6 h-6" />
             </div>
             <h3 className="text-2xl font-bold text-slate-900">Log Drinks</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        
        <p className="text-sm text-slate-500 leading-relaxed">
          We'll adjust your meal plan for the next 3 days to help you recover, rehydrate, and replenish nutrients.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">What did you have?</label>
            <input 
              className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium" 
              placeholder="e.g. Red Wine, Tequila, Beer" 
              value={brand}
              onChange={e => setBrand(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">How much?</label>
            <input 
              className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium" 
              placeholder="e.g. 2 glasses, 4 shots" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </div>

        <button 
          onClick={() => {
            if (brand && amount) {
              onSave({ id: Date.now().toString(), brand, amount, timestamp: Date.now() });
              setBrand(''); setAmount('');
              onClose();
            }
          }}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
        >
          Start Recovery Plan
        </button>
      </div>
    </div>
  );
};

const FoodLogger = ({ onAddFood, onLogAlcohol }: { onAddFood: (items: FoodItem[]) => void, onLogAlcohol: () => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState({ name: '', quantity: '', cals: '', p: '', c: '', f: '' });
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>('Breakfast');
  const [showCamera, setShowCamera] = useState(false);

  // Determine default category based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) setSelectedCategory('Breakfast');
    else if (hour < 16) setSelectedCategory('Lunch');
    else if (hour < 19) setSelectedCategory('Snack');
    else setSelectedCategory('Dinner');
  }, []);

  const handleCapture = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const items = await analyzeFoodImage(base64);
      const fullItems = items.map(i => ({
          ...i,
          id: i.id || Math.random().toString(),
          timestamp: Date.now(),
          isAlcohol: i.isAlcohol || false,
          calories: i.calories || 0,
          protein: i.protein || 0,
          carbs: i.carbs || 0,
          fat: i.fat || 0,
          portion: i.portion || "1 serving",
          name: i.name || "Unknown Food",
          image: `data:image/jpeg;base64,${base64}`,
          mealCategory: selectedCategory
      } as FoodItem));
      
      onAddFood(fullItems);
    } catch (err) {
      alert("Failed to analyze image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEstimate = async () => {
    if (!manualInput.name) return;
    const qty = manualInput.quantity || "1 serving"; 
    setIsEstimating(true);
    try {
        const stats = await estimateNutrition(manualInput.name, qty);
        setManualInput(prev => ({
            ...prev,
            cals: stats.calories.toString(),
            p: stats.protein.toString(),
            c: stats.carbs.toString(),
            f: stats.fat.toString()
        }));
    } catch (e) {
        // quiet fail
    } finally {
        setIsEstimating(false);
    }
  };

  const handleManualSubmit = () => {
    if(!manualInput.name || !manualInput.cals) return;
    const item: FoodItem = {
      id: Math.random().toString(),
      name: manualInput.name,
      calories: Number(manualInput.cals),
      protein: Number(manualInput.p) || 0, 
      carbs: Number(manualInput.c) || 0, 
      fat: Number(manualInput.f) || 0,
      portion: manualInput.quantity || "1 serving",
      timestamp: Date.now(),
      isAlcohol: false,
      mealCategory: selectedCategory
    };
    onAddFood([item]);
    setManualInput({ name: '', quantity: '', cals: '', p: '', c: '', f: '' });
    setManualMode(false);
  };

  const categories: MealCategory[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

  return (
    <>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center relative">
        <h3 className="text-lg font-bold mb-4">Log Meal</h3>

        {/* Category Selector */}
        <div className="flex justify-between mb-6 bg-slate-50 p-1 rounded-xl">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${selectedCategory === cat ? 'bg-white shadow text-primary' : 'text-slate-500'}`}
              >
                {cat}
              </button>
            ))}
        </div>
        
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
            <p className="text-slate-500">Analyzing {selectedCategory}...</p>
          </div>
        ) : !manualMode ? (
          <div className="grid grid-cols-3 gap-3">
            {/* Camera Button */}
            <button 
              onClick={() => setShowCamera(true)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors group"
            >
              <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold text-xs text-slate-600">Snap</span>
            </button>

            {/* Manual Button */}
            <button 
              onClick={() => setManualMode(true)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors group"
            >
              <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Utensils className="w-5 h-5 text-secondary" />
              </div>
              <span className="font-semibold text-xs text-slate-600">Type</span>
            </button>

              {/* Alcohol Button - Prominent */}
              <button 
                onClick={onLogAlcohol}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors group"
              >
              <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Wine className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="font-semibold text-xs text-indigo-700">Drinks</span>
            </button>

          </div>
        ) : (
          <div className="space-y-4 text-left animate-in fade-in duration-300">
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase">Food Name</label>
              <input 
                  className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 focus:border-primary outline-none mt-1" 
                  value={manualInput.name} 
                  onChange={e => setManualInput(p=>({...p, name: e.target.value}))} 
                  placeholder="e.g. Banana, Chicken Breast" 
              />
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-500 font-bold uppercase">Quantity</label>
                <input 
                    className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 focus:border-primary outline-none mt-1" 
                    value={manualInput.quantity} 
                    onChange={e => setManualInput(p=>({...p, quantity: e.target.value}))} 
                    placeholder="e.g. 1 medium, 200g" 
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleEstimate}
                  disabled={isEstimating || !manualInput.name}
                  className="mb-[1px] bg-indigo-50 text-indigo-600 border border-indigo-200 p-3 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                >
                  {isEstimating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div> : <Wand2 className="w-4 h-4" />}
                  Auto-Fill
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-bold uppercase">Calories (kcal)</label>
              <input 
                  className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 focus:border-primary outline-none mt-1 font-mono font-medium" 
                  type="number" 
                  value={manualInput.cals} 
                  onChange={e => setManualInput(p=>({...p, cals: e.target.value}))} 
                  placeholder="e.g. 105" 
              />
              {manualInput.p && (
                  <div className="flex gap-2 mt-2 text-[10px] text-slate-400">
                      <span>Protein: {manualInput.p}g</span>
                      <span>Carbs: {manualInput.c}g</span>
                      <span>Fat: {manualInput.f}g</span>
                  </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setManualMode(false)} className="flex-1 py-3 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleManualSubmit} className="flex-1 bg-primary text-white rounded-lg py-3 font-semibold shadow-lg shadow-primary/30">Add Food</button>
            </div>
          </div>
        )}
      </div>

      <CameraModal 
        isOpen={showCamera} 
        onClose={() => setShowCamera(false)} 
        onCapture={handleCapture} 
      />
    </>
  );
};

const MealLog = ({ log, date, onDateChange, onDelete }: { log: DailyLog, date: string, onDateChange: (d: string) => void, onDelete: (id: string) => void }) => {
  const categories: MealCategory[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
  const totalCals = log.foods.reduce((sum, f) => sum + f.calories, 0);

  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Date Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-4 py-4 flex items-center justify-between border-b border-slate-100">
         <button onClick={() => changeDate(-1)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100"><ChevronLeft className="w-5 h-5 text-slate-500"/></button>
         <div className="text-center">
            <h2 className="text-sm font-bold text-slate-900">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h2>
            <p className="text-xs text-slate-500">{totalCals} kcal total</p>
         </div>
         <button onClick={() => changeDate(1)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100"><ChevronRight className="w-5 h-5 text-slate-500"/></button>
      </div>

      {log.foods.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No meals logged for this day.</p>
        </div>
      ) : (
        categories.map(cat => {
          const foodsInCat = log.foods.filter(f => f.mealCategory === cat || (!f.mealCategory && cat === 'Breakfast')); // Fallback for old data
          if (foodsInCat.length === 0) return null;

          return (
            <div key={cat} className="mx-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                 {cat === 'Breakfast' && <Coffee className="w-4 h-4"/>}
                 {cat === 'Lunch' && <Sun className="w-4 h-4"/>}
                 {cat === 'Snack' && <Clock className="w-4 h-4"/>}
                 {cat === 'Dinner' && <Moon className="w-4 h-4"/>}
                 {cat}
              </h3>
              <div className="space-y-3">
                {foodsInCat.map(food => (
                  <div key={food.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4 items-center">
                    {food.image && <img src={food.image} alt="food" className="w-12 h-12 rounded-lg object-cover" />}
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{food.name}</h4>
                      <p className="text-xs text-slate-500">{food.portion} • {food.calories} kcal</p>
                      <div className="flex gap-2 mt-1">
                        {food.isAlcohol && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Alcohol</span>}
                        {food.protein > 0 && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">P: {food.protein}g</span>}
                        {food.carbs > 0 && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">C: {food.carbs}g</span>}
                      </div>
                    </div>
                    <button onClick={() => onDelete(food.id)} className="p-2 text-slate-300 hover:text-danger">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

const Planner = ({ user, stats, log, history, lastAlcohol, onEndRecovery }: { user: UserProfile, stats: NutritionStats, log: DailyLog, history: Record<string, DailyLog>, lastAlcohol: AlcoholEntry | null, onEndRecovery: () => void }) => {
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [loading, setLoading] = useState(false);

  const consumed = log.foods.reduce((sum, f) => sum + f.calories, 0);
  const remaining = stats.targetCalories - consumed;

  // Check if alcohol was consumed in the last 72 hours (3 days)
  const daysSinceAlcohol = lastAlcohol ? Math.floor((Date.now() - lastAlcohol.timestamp) / (24 * 60 * 60 * 1000)) + 1 : 100;
  const isRecoveryMode = daysSinceAlcohol <= 3;

  useEffect(() => {
    const fetchPlan = async () => {
      setLoading(true);
      // Pass the alcohol context if in recovery mode
      const alcoholContext = isRecoveryMode ? lastAlcohol : undefined;
      
      // Get last 3 days of history for context
      const today = new Date().toISOString().split('T')[0];
      const recentLogs = Object.values(history)
        .filter(h => h.date !== today) // Exclude today, as today is passed as currentLog
        .sort((a,b) => b.date.localeCompare(a.date)) // Sort Desc
        .slice(0, 3); // Take top 3

      const suggestions = await generateMealPlan(user, log, remaining, recentLogs, alcoholContext);
      setPlannedMeals(suggestions);
      setLoading(false);
    };
    fetchPlan();
  }, [log.foods.length, isRecoveryMode]); // Refresh when log changes or recovery mode changes

  const getIcon = (cat: MealCategory) => {
    switch(cat) {
      case 'Breakfast': return <Coffee className="w-5 h-5" />;
      case 'Lunch': return <Sun className="w-5 h-5" />;
      case 'Snack': return <Clock className="w-5 h-5" />;
      case 'Dinner': return <Moon className="w-5 h-5" />;
    }
  };

  const getRecoveryLabel = (day: number) => {
    if (day === 1) return "Day 1: Hydration & Care";
    if (day === 2) return "Day 2: Replenish Nutrients";
    return "Day 3: Back on Track";
  };

  return (
    <div className="space-y-6 pb-24">
      {isRecoveryMode && (
        <div className="mx-4 bg-indigo-50 border border-indigo-100 p-5 rounded-3xl flex flex-col gap-3 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-full">
                <Droplet className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-indigo-900">Recovery Mode</h3>
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                  {getRecoveryLabel(daysSinceAlcohol)}
                </p>
              </div>
            </div>
            <button
              onClick={onEndRecovery}
              className="flex items-center gap-1 bg-white text-indigo-600 text-[10px] font-bold px-3 py-2 rounded-xl shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-colors"
            >
              <Power className="w-3 h-3" />
              Turn Off
            </button>
          </div>
          <div className="bg-white/60 p-3 rounded-xl">
             <p className="text-xs text-indigo-800 leading-relaxed">
               Because you had <strong>{lastAlcohol?.brand}</strong> recently, we've adjusted your plan to prioritize liver support and hydration.
             </p>
          </div>
        </div>
      )}

      <div className="px-4">
        <h2 className="text-xl font-bold mb-1">Smart Suggestions</h2>
        <p className="text-sm text-slate-500">Tailored to your remaining {remaining} kcal & recent history.</p>
      </div>

      {loading ? (
        <div className="space-y-8 px-4">
           {[1,2].map(i => (
             <div key={i} className="space-y-2">
                <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
             </div>
           ))}
        </div>
      ) : plannedMeals.length === 0 ? (
        <div className="text-center py-12 text-slate-400 px-4">
           <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50 text-green-500" />
           <p className="font-semibold text-slate-600">All meals logged for today!</p>
           <p className="text-xs">Check back tomorrow for a new plan.</p>
        </div>
      ) : (
        <div className="space-y-8 px-4">
          {plannedMeals.map((section, idx) => (
            <div key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{animationDelay: `${idx * 100}ms`}}>
               
               {/* Section Header */}
               <div className="flex items-center gap-2 mb-3">
                 <div className="bg-primary/10 p-2 rounded-full text-primary">
                    {getIcon(section.category)}
                 </div>
                 <div>
                   <h3 className="font-bold text-lg text-slate-800">{section.category}</h3>
                   <p className="text-xs text-slate-500">{section.advice}</p>
                 </div>
               </div>

               {/* Suggestions List */}
               <div className="space-y-3 pl-2 border-l-2 border-slate-100 ml-4">
                 {section.suggestions.map((recipe, rIdx) => (
                   <div key={rIdx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-slate-800">{recipe.name}</h4>
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-lg">{recipe.calories} kcal</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{recipe.description}</p>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                          {recipe.ingredients.join(', ')}
                        </span>
                      </div>
                      
                      {recipe.tags?.map(t => (
                        <span key={t} className={`absolute top-0 right-0 text-[9px] px-2 py-0.5 rounded-bl-lg font-bold uppercase tracking-wider
                          ${t.includes('Skip') ? 'bg-red-100 text-red-600' : 'bg-green-50 text-green-600'}
                        `}>
                          {t}
                        </span>
                      ))}
                   </div>
                 ))}
               </div>
            </div>
          ))}
        </div>
      )}
       <div className="px-4">
        <Disclaimer />
       </div>
    </div>
  );
};

// --- Main App Logic ---

export default function App() {
  const [view, setView] = useState<ViewState>('onboarding');
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // New State: Full History Map (YYYY-MM-DD -> Log)
  const [history, setHistory] = useState<Record<string, DailyLog>>({});
  
  // State for Alcohol Log
  const [alcoholLog, setAlcoholLog] = useState<AlcoholEntry | null>(null);
  const [showAlcoholModal, setShowAlcoholModal] = useState(false);

  // View State for Log Page
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);

  const today = new Date().toISOString().split('T')[0];

  // Helper to get log for a specific date (safe access)
  const getLog = (date: string): DailyLog => {
    return history[date] || { date: date, foods: [], waterIntakeMl: 0 };
  };

  // Derived state for current interactions
  const todayLog = getLog(today);

  // Load from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('nutri_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('dashboard');
    }
    
    const savedHistory = localStorage.getItem('nutri_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    } else {
        // Fallback for migration from old 'nutri_log' to history
        const oldLog = localStorage.getItem('nutri_log');
        if (oldLog) {
            const parsed = JSON.parse(oldLog);
            if (parsed.date) {
                setHistory({ [parsed.date]: parsed });
            }
        }
    }

    const savedAlcohol = localStorage.getItem('nutri_alcohol');
    if (savedAlcohol) {
      setAlcoholLog(JSON.parse(savedAlcohol));
    }
  }, []);

  // Save changes
  useEffect(() => {
    if (user) localStorage.setItem('nutri_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('nutri_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (alcoholLog) {
      localStorage.setItem('nutri_alcohol', JSON.stringify(alcoholLog));
    } else {
      localStorage.removeItem('nutri_alcohol');
    }
  }, [alcoholLog]);

  const handleUserComplete = (profile: UserProfile) => {
    setUser(profile);
    setView('dashboard');
  };

  const handleAddFood = (items: FoodItem[]) => {
    // Always add to TODAY'S log
    setHistory(prev => {
        const current = prev[today] || { date: today, foods: [], waterIntakeMl: 0 };
        return {
            ...prev,
            [today]: {
                ...current,
                foods: [...current.foods, ...items]
            }
        };
    });
  };

  const handleDeleteFood = (id: string) => {
    // Delete from the VIEWED date
    setHistory(prev => {
        const current = prev[viewDate];
        if (!current) return prev;
        return {
            ...prev,
            [viewDate]: {
                ...current,
                foods: current.foods.filter(f => f.id !== id)
            }
        };
    });
  };

  const handleEndRecovery = () => {
    setAlcoholLog(null);
  };

  if (!user || view === 'onboarding') {
    return <Onboarding onComplete={handleUserComplete} />;
  }

  const stats = getNutritionStats(user);

  return (
    <div className="min-h-screen bg-slate-50 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Top Navigation / Header */}
      <header className="bg-white px-6 pt-12 pb-4 shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-center">
           <div>
             <h1 className="text-xl font-bold text-slate-900">Hello, {user.name || 'Friend'}</h1>
             <p className="text-xs text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
           </div>
           <button onClick={() => setView('profile')} className="bg-slate-100 p-2 rounded-full">
             <User className="w-5 h-5 text-slate-600" />
           </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="h-[calc(100vh-160px)] overflow-y-auto no-scrollbar pt-6 px-4">
        {view === 'dashboard' && (
          <>
            <Dashboard user={user} stats={stats} log={todayLog} />
            <div className="mt-4">
               <FoodLogger onAddFood={handleAddFood} onLogAlcohol={() => setShowAlcoholModal(true)} />
            </div>
            <div className="h-8"></div>
          </>
        )}
        {view === 'log' && (
            <MealLog 
                log={getLog(viewDate)} 
                date={viewDate}
                onDateChange={setViewDate}
                onDelete={handleDeleteFood} 
            />
        )}
        {view === 'plan' && <Planner user={user} stats={stats} log={todayLog} history={history} lastAlcohol={alcoholLog} onEndRecovery={handleEndRecovery} />}
        {view === 'profile' && (
           <div className="space-y-4 pb-24">
             <div className="bg-white p-6 rounded-3xl shadow-sm">
                <h2 className="text-xl font-bold mb-4">My Profile</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b pb-2"><span>Height</span><span>{user.heightCm} cm</span></div>
                  <div className="flex justify-between border-b pb-2"><span>Current Weight</span><span>{user.weightKg} kg</span></div>
                  <div className="flex justify-between border-b pb-2"><span>Target Weight</span><span>{user.targetWeightKg} kg</span></div>
                   <div className="flex justify-between border-b pb-2"><span>Base Activity</span><span>{user.activityLevel}</span></div>
                  <div className="flex justify-between pt-2"><span>Goal</span><span>{user.goal}</span></div>
                </div>
                <button 
                  onClick={() => {
                    localStorage.removeItem('nutri_user');
                    localStorage.removeItem('nutri_history');
                    localStorage.removeItem('nutri_alcohol');
                    setUser(null);
                    setView('onboarding');
                  }}
                  className="w-full mt-6 py-3 text-red-500 border border-red-100 bg-red-50 rounded-xl"
                >
                  Sign Out / Reset
                </button>
             </div>
           </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-white border-t border-slate-200 px-6 py-4 pb-8 flex justify-between items-center z-20">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 ${view === 'dashboard' ? 'text-primary' : 'text-slate-400'}`}>
          <Activity className="w-6 h-6" />
          <span className="text-[10px] font-medium">Dash</span>
        </button>
        <button onClick={() => setView('log')} className={`flex flex-col items-center gap-1 ${view === 'log' ? 'text-primary' : 'text-slate-400'}`}>
          <Utensils className="w-6 h-6" />
          <span className="text-[10px] font-medium">Log</span>
        </button>
        <div className="relative -top-6">
           <button 
             onClick={() => setView('dashboard')} // Usually triggers a specific action, here just bringing back to dash/logger
             className="bg-primary text-white p-4 rounded-full shadow-lg shadow-primary/40 transform active:scale-95 transition-transform"
           >
             <Plus className="w-6 h-6" />
           </button>
        </div>
        <button onClick={() => setView('plan')} className={`flex flex-col items-center gap-1 ${view === 'plan' ? 'text-primary' : 'text-slate-400'}`}>
          <TrendingUp className="w-6 h-6" />
          <span className="text-[10px] font-medium">Plan</span>
        </button>
        <button onClick={() => setView('profile')} className={`flex flex-col items-center gap-1 ${view === 'profile' ? 'text-primary' : 'text-slate-400'}`}>
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Me</span>
        </button>
      </nav>

      {/* Alcohol Modal */}
      <AlcoholModal 
        isOpen={showAlcoholModal} 
        onClose={() => setShowAlcoholModal(false)}
        onSave={(entry) => {
          setAlcoholLog(entry);
        }}
      />
    </div>
  );
}