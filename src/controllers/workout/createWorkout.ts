import { Request, Response } from 'express';
import { isEmptyFields } from '../../utils/errorUtils';
import UserDetails from '../../models/user/UserDetails';
import OpenAI from 'openai';
import PlansSchema from '../../models/workout/Workout';
import moment from 'moment';

export const createWorkout = async (req: Request, res: Response) => {
	if (req.isAuth) {
		const { age, gender, weight, height, injuries, trainingLevel, trainingType } = req.body;
		const { _id: userId } = req.user;
		if (isEmptyFields({ age, gender, weight, height, trainingLevel })) {
			return res.status(400).json({ error: 'Either Age/Gender/Weight/Height/TrainingLevel is empty' });
		}
		const userDetails = await UserDetails.create({
			userId,
			age,
			gender,
			weight,
			height,
			injuries,
			trainingLevel,
			trainingType,
		});

		const isWorkoutExist = await PlansSchema.findOne({ userId });
		if (isWorkoutExist) {
			return res.status(200).json({ workouts: isWorkoutExist });
		}

		const prompt = `
		You are a personalized gym trainer AI designed to create personalized workout plans tailored to the user's body features and preferences. Based on the following user information, generate a detailed workout plan in JSON format with structured responses and an analysis of whether the workout plan fulfills the user's goals, along with reasons.

	  User Details:
	  - Age: ${age}
	  - Gender: ${gender}
	  - Height: ${height} in feet
	  - Weight: ${weight} in kg
	  - Injuries: ${injuries ?? 'None'}

	  Additional Information Provided:
	  - Gym experience Level: ${trainingLevel ?? 'None'}
	  - User's goal : ${trainingType ?? 'None'}

	  Please include the following section in the JSON output:

	  1. *data*: A JSON array of object for 6 days of the week with training on a single body part per day. Body parts will be Chest, Back, Biceps, Triceps, Shoulders and Legs. Ideally a body part should not be trained more than twice in a week and only one body part should be trained per day.
	  For a particular day, there should be at least 3 exercises per body part.

	  Instructions
	  - Ensure that the workout plan, exercises, exercise reps, and sets align with the user's goal (e.g., weight loss, muscle gain, etc.), gym experience, and the user’s body attributes (age, gender, height, weight).
	  - If the user has injuries, suggest modifications to avoid stress on affected areas.
	  - Tailor the workout intensity based on the user's age and experience level (e.g., beginners should have simpler exercises).
	  - Ensure your model should not suggest exercises for Sunday.
	  - Ensure that your model does not return anything after the array of objects.

	  Format the output in JSON as follows:(Strictly follow the json format, please do not add any other information)

	  [
		{
		  "day": "Monday",
		  "bodyPart":"Chest",
		  "exercises": [
				  {
					"name": "Bench Press",
					"sets": 4,
					"reps": 8,
					"bodyPart": "Chest",
					"description": "Focus on pushing the barbell off your chest to strengthen your chest, shoulders, and triceps."
				  },
				  ....
				  ],
		},
		{
		  "day": "Tuesday",
		  "body_part": "Legs",
		  "exercises": [
				  {
					"name": "Lunges",
					"sets": 3,
					"reps": 12,
					"bodyPart": "Legs",
					"description": "A lower body movement that targets the quads and glutes. Alternate legs with each step."
					}
					],
				 ...
		},
		...
		]
	`;

		const openai = new OpenAI({
			apiKey: process.env.OPEN_API_KEY,
		});

		const aiResponse = await openai.chat.completions.create({
			messages: [{ role: 'user', content: prompt }],
			model: 'gpt-4o-mini',
			max_tokens: 3000,
		});
		//@ts-ignore
		let plans = aiResponse?.choices[0]?.message?.content
			.replace(/```json/g, '')
			.replace(/```/g, '')
			.trim();
		plans = JSON.parse(plans);
		console.log('before modification',plans);
		//@ts-ignore
		plans = generateMonthlyWorkout(plans)
		console.log('after modification',plans);

		//@ts-ignore
		const workouts = await PlansSchema.create({
			userId,
			userDetailId: userDetails._id,
			//@ts-ignore
			plans: plans.map((dayPlan: any) => ({
				day: dayPlan.day,
				bodyPart: dayPlan.bodyPart,
				date: dayPlan.date,
				exercises: dayPlan.exercises.map((exercise: any) => ({
					name: exercise.name,
					sets: exercise.sets,
					reps: exercise.reps,
					bodyPart: exercise.bodyPart,
					description: exercise.description,
					weights: []
				})),
			})),
		});
		return res.status(200).json({ workouts });
	} else {
		return res.status(403).json({ err: 'Authroization error' });
	}
};

const generateMonthlyWorkout = (plans:any) => {
	const today = moment(); 
	const daysInMonth = moment(today).daysInMonth(); 

	const monthlyWorkout = [];
	let currentDate = moment(today);
	
	for (let i = 0; i < daysInMonth; i++) {
	  const dayOfWeek = currentDate.format('dddd'); 
	  const workoutForDay = plans.find((item: any) => item.day === dayOfWeek); 
  
	  if (workoutForDay) {
		monthlyWorkout.push({
		  date: currentDate.format('YYYY-MM-DD'), 
		  ...workoutForDay
		});
	  }
  
	  currentDate.add(1, 'days'); 
	}
  
	return monthlyWorkout;
  }

export const getAllPlans = async (req: Request, res: Response) => {
	if (req.isAuth) {
		const { _id: userId } = req.user;
		const isWorkoutExist = await PlansSchema.findOne({ userId });
		if (isWorkoutExist) {
			return res.status(200).json({ workouts: isWorkoutExist });
		}
		return res.status(404).json({ error: 'No workout found' });
	} else {
		return res.status(403).json({ error: 'Authroization error' });
	}
};

export const getSuggestions = async (req: Request, res: Response) => {
	if (req.isAuth) {
		const { prompt } = req.body;
		const openai = new OpenAI({
			apiKey: process.env.OPEN_API_KEY,
		});

		const aiResponse = await openai.chat.completions.create({
			messages: [{ role: 'user', content: prompt }],
			model: 'gpt-4o-mini',
			max_tokens: 4000,
		});
		console.log('response',aiResponse)
		if (aiResponse) {
			return res.status(200).json({ suggestions:aiResponse.choices[0].message.content });
		}
		return res.status(404).json({ error: 'No response found', prompt });
	} else {
		return res.status(403).json({ error: 'Authroization error' });
	}
};

export const markWorkoutAsDone = async (req: Request, res: Response) => {
	if (req.isAuth) {
		const { _id: userId } = req.user;
		const { startWeight, endWeight,planId,exerciseId,date } = req.body;
		const plan = await PlansSchema.findOne({ userId });
		if(!plan) return res.status(404).json({ error: 'No Plan found' });
		//@ts-ignore
		const selectedPlan = plan.plans.find((p: any) => p._id == planId);
		if(!selectedPlan) return res.status(404).json({ error: 'No Selected Plan found' });
		const selectedExercise = selectedPlan.exercises.find((e: any) => e._id == exerciseId);
		if(!selectedExercise) return res.status(404).json({ error: 'No Selected Exercise Found' });
		selectedExercise.weights.push({ startWeight, endWeight,date });
		await plan.save();
		const plan2 = await PlansSchema.findOne({ userId });
		return res.json({plan2})
	}else{
		return res.status(403).json({ error: 'Authroization error' });
	}
};

export const getExercisesForWorkout = async (req: Request, res: Response) => {
	if (req.isAuth) {
		const { _id: userId } = req.user;
		const { planId } = req.query;
		const plan = await PlansSchema.findOne({ userId });
		if(!plan) return res.status(404).json({ error: 'No Plan found' });
		//@ts-ignore
		const selectedPlan = plan.plans.find((p: any) => p._id == planId);
		return res.json({  workout:selectedPlan});
	}else{
		return res.status(403).json({ error: 'Authroization error' });
	}
}