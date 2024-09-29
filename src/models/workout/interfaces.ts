import { Document } from 'mongoose';

export interface IPlans extends Document {
	day: string;
	bodyPart: string;
	exercises: Array<any>;
}
