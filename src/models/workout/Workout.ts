import { Schema, model } from 'mongoose';
import { IPlans } from './interfaces';

const weightSchema = new Schema({
	date: { type: String },
	startWeight: { type: Number }, 
	endWeight: { type: Number },   
	weightUnit: { type: String, default: 'kg' }, 
  });
  

const exerciseSchema = new Schema({
	name: { type: String },
	reps: { type: Number },
	sets: { type: Number },
	bodyPart: { type: String },
	description: { type: String },
	weights:[weightSchema]
	
});

const plansSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'user' },
		userDetailId: { type: Schema.Types.ObjectId, ref: 'userDetails' },
		plans: [
			{
				day: String,
				bodyPart: String,
				date:String,
				exercises: [exerciseSchema],
			},
		],
	},
	{ timestamps: true }
);

const PlansSchema = model<IPlans>('plans', plansSchema);	

export default PlansSchema;
