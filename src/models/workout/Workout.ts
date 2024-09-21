import { Schema, model } from 'mongoose';
import { IPlans } from './interfaces';

const exerciseSchema = new Schema({
	name: { type: String },
	reps: { type: Number },
	sets: { type: Number },
	bodyPart: { type: String },
	description: { type: String },
});

const plansSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'user' },
		userDetailId: { type: Schema.Types.ObjectId, ref: 'userDetails' },
		plans: [
			{
				day: String,
				bodyPart: String,
				exercises: [exerciseSchema],
			},
		],
	},
	{ timestamps: true }
);

const PlansSchema = model<IPlans>('plans', plansSchema);

export default PlansSchema;
