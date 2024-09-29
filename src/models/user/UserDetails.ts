import { Schema, model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { IUserDetail } from './interface';

const userDetailSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'user' },
		age: {
			type: Number,
			required: [true, 'Please enter an Age'],
		},
		gender: {
			type: String,
			required: [true, 'Please enter Gender'],
		},
		weight: {
			type: Number,
			required: [true, 'Please enter Weight'],
		},
		height: {
			type: Number,
			required: [true, 'Please enter Height'],
		},
		injuries: {
			type: Array,
		},
		trainingLevel: {
			type: Array,
			required: [true, 'Please enter Training Level'],
		},
		trainingType: {
			type: String,
		},
	},
	{ timestamps: true }
);

const UserDetails = model<IUserDetail>('userDetails', userDetailSchema);

userDetailSchema.plugin(uniqueValidator, { message: '{PATH} already exist' });

export default UserDetails;
