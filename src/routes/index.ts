import { Router } from 'express';

import authRouter from './auth.router';
import isAuth from '../middleware/is-auth';
import workoutRouter from './workout.router';

const router: Router = Router();

router.use('/auth', isAuth, authRouter);
router.use('/workout', isAuth, workoutRouter);

router.use('/health', (req, res) => {
	res.status(200).json({
		status: 'ok',
		env: process.env.ENV,
	});
});

export default router;
