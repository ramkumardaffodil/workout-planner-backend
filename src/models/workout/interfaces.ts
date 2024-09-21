import { Document } from 'mongoose';

export interface IPlans extends Document {
	day: string;
	bodyPart: string;
	excercises: string;
}
