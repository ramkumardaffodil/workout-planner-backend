import { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
	_id: Schema.Types.ObjectId;
	name: string;
	email: string;
	password: string;
	phoneNumber: string;
	userType: string;
	resetLink: string;
	refreshToken: string;
	expoPushToken: string;
	address: string;
}

export interface IUserDetail extends Document {
	_id: Schema.Types.ObjectId;
	age: number;
	gender: string;
	weight: number;
	height: number;
	injuries: Array<any>;
	trainingLevel: string;
	trainingType: string;
}

export interface IModel extends Model<IUser> {
	login: (email: Schema.Types.ObjectId, password: string) => IUser;
	addRefreshToken: (id: Schema.Types.ObjectId, refreshToken: string) => Record<string, unknown>;
	findUserForRefreshToken: (id: Schema.Types.ObjectId, refreshToken: string) => IUser;
}
