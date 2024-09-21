import { Router } from 'express';
import { createWorkout } from '../controllers/workout/createWorkout';
import isAuth from '../middleware/is-auth';

const workoutRouter: Router = Router();

workoutRouter.post('/create-workout', isAuth, createWorkout);

export default workoutRouter;
