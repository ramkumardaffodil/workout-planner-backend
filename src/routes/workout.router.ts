import { Router } from 'express';
import { createWorkout, getAllPlans, getSuggestions } from '../controllers/workout/createWorkout';
import isAuth from '../middleware/is-auth';

const workoutRouter: Router = Router();

workoutRouter.post('/create-workout', isAuth, createWorkout);

workoutRouter.get('/get-plans',isAuth,getAllPlans);

workoutRouter.post('/get-suggestions',isAuth,getSuggestions);



export default workoutRouter;
