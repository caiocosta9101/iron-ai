// client/src/types/workout.ts
export interface WorkoutActivity {
  id: string;
  name: string;
  date: string;
  duration: string;
  volume: string;
  type: 'strength' | 'cardio';
}