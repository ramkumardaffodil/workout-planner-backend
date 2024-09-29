import { Router } from 'express';
import { createWorkout, getAllPlans, getExercisesForWorkout, getSuggestions, markWorkoutAsDone } from '../controllers/workout/createWorkout';
import isAuth from '../middleware/is-auth';

const workoutRouter: Router = Router();

workoutRouter.post('/create-workout', isAuth, createWorkout);

workoutRouter.get('/get-plans', isAuth, getAllPlans);

workoutRouter.post('/get-suggestions', isAuth, getSuggestions);

workoutRouter.post('/mark-workout-done', isAuth, markWorkoutAsDone);

workoutRouter.get('/get-exercise-for-workouts',isAuth,getExercisesForWorkout)

export default workoutRouter;
