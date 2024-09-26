import { Request, Response } from 'express';
import { isEmptyFields } from '../../utils/errorUtils';
import UserDetails from '../../models/user/UserDetails';
import OpenAI from 'openai';
import PlansSchema from '../../models/workout/Workout';

export const createWorkout = async (req: Request, res: Response) => {
	if (req.isAuth) {
		const { age, gender, weight, height, injuries, trainingLevel, trainingType } = req.body;
		const { _id: userId } = req.user;
		if (isEmptyFields({ age, gender, weight, height, injuries, trainingLevel })) {
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
				- Height: ${height} in cm
				- Weight: ${weight} in kg

				- Injuries: ${injuries ?? 'None'}


				Additional Information Needed:
				- Gym experience Level: ${trainingLevel ?? 'None'}
				- User's goal : ${trainingType ?? 'None'}

				Please include the following sections in the JSON output:

				1. **data**: A JSON arrray of object for 6 days of the week with training on a single body part per day. Body parts will be Chest, Back, Biceps, Triceps, Shoulders and Legs. Ideally a body part should not be trained more than twice in a week and only one body part should be trained per day.
				For a particular day, there should be atleast 3 exercises per body part.

				Instructions:
				- Ensure that the workout plan aligns with the user's goal (e.g., weight loss, muscle gain).
				- Ensure that your model should not suggest excercises for sunday.
				- Ensure that your model does not return anything after array of object.

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
		//@ts-ignore
		const workouts = await PlansSchema.create({
			userId,
			userDetailId: userDetails._id,
			//@ts-ignore
			plans: plans.map((dayPlan: any) => ({
				day: dayPlan.day,
				bodyPart: dayPlan.bodyPart,
				exercises: dayPlan.exercises.map((exercise: any) => ({
					name: exercise.name,
					sets: exercise.sets,
					reps: exercise.reps,
					bodyPart: exercise.bodyPart,
					description: exercise.description,
				})),
			})),
		});
		return res.status(200).json({ workouts });
	} else {
		return res.status(403).json({ err: 'Authroization error' });
	}
};

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
