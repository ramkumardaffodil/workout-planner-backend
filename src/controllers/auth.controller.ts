import { Request, Response } from 'express';
import getJwtToken, { verifyRefreshToken } from '../utils/token';

import User from '../models/user/User';
import { IUser } from '../models/user/interface';
import { Expo } from 'expo-server-sdk';

import { formatDbError, isEmptyFields, verifyObjectId } from '../utils/errorUtils';

import NodeMailer from '../config/nodemailer';
import validator from 'validator';
import { ObjectId } from 'mongoose';

import bcrypt from 'bcrypt';

export interface BasicUser {
	_id?: ObjectId;
	ownerId?: ObjectId;
	name?: string;
	email?: string;
	phoneNumber?: string;
	userType?: string;
	expoPushToken?: string;
	address?: string;
}

export class AuthController {
	signUp = async (req: Request, res: Response): Promise<Response<void>> => {
		const { email, password } = req.body;
		const userData = { email, password };
		if (isEmptyFields(userData)) {
			return res.status(400).json({ err: 'All fields are mandatory!' });
		}

		if (!validator.isEmail(email)) {
			return res.status(400).json({ err: 'Either email is not valid' });
		}

		if (password.length < 6) {
			return res.status(400).json({ err: 'Password must be at least 6 characters' });
		}

		try {
			const userdoc = await User.create(userData);

			const accessToken = await getJwtToken(userdoc, process.env.JWT_ACCESS_SECRET as string, '1d');
			const refreshToken = await getJwtToken(userdoc, process.env.JWT_REFRESH_SECRET as string, '1d');

			const user = await User.addRefreshToken(userdoc._id, refreshToken);

			return res.status(200).json({ user, accessToken });
		} catch (error) {
			return res.status(400).json({ error: formatDbError(error) });
		}
	};

	// Not using this functionality for now
	authenticate = async (req: Request, res: Response) => {
		const { email, password } = req.body;
		const userData = { email, password };

		if (isEmptyFields(userData)) {
			return res.status(400).json({ err: 'All fields are mandatory!' });
		}

		if (!validator.isEmail(email)) {
			return res.status(400).json({ err: 'Either email is not valid' });
		}

		if (password.length < 6) {
			return res.status(400).json({ err: 'Password must be at least 6 characters' });
		}

		try {
			const userdoc: IUser = await User.login(email, password);

			// For generating tokens
			const accessToken = await getJwtToken(userdoc, process.env.JWT_ACCESS_SECRET as string, '10d');
			const refreshToken = await getJwtToken(userdoc, process.env.JWT_REFRESH_SECRET as string, '1d');

			const user = await User.addRefreshToken(userdoc._id, refreshToken);
			return res.status(200).json({
				email: user.email,
				userId: user._id,
				accessToken,
				refreshToken,
			});
		} catch (error: any) {
			return res.status(400).json({ err: formatDbError(error) });
		}
	};

	handleRefreshToken = async (req: Request, res: Response) => {
		const { refreshToken } = req.body;
		if (!refreshToken || !refreshToken.length) {
			return res.status(400).json({ err: 'Refresh token is  missing!' });
		}
		try {
			// verifyrefresh token method verify token and give us the payload inside it
			const userData = await verifyRefreshToken(refreshToken, <string>process.env.JWT_REFRESH_SECRET);

			const userDocument = await User.findUserForRefreshToken(userData._id, refreshToken);

			const userDetails = await User.findOne({ objectId: userData._id });
			const { accessToken, refreshToken: refreshToken1 } = await this.generateTokensForUser(userDocument);

			const result = {
				userDetails,
				accessToken,
				refreshToken: refreshToken1,
				firstLogin: false,
			};

			return res.status(200).json({ userDocument: result });
		} catch (error: any) {
			console.log('error is: ', error);
			return res.status(403).json({ err: error.message });
		}
	};

	forgotPassword = async (req: Request, res: Response) => {
		const { email } = req.body;
		if (!email) return res.status(400).json({ err: 'Email is  mandatory!' });
		if (!validator.isEmail(email)) {
			return res.json({ err: 'Email is not valid' });
		}
		const nodeMailer = new NodeMailer();
		try {
			const user = await User.findOne({ email });
			// not finding a user in DB is not an error, so it will not go inside catch block, it needs to be handled here
			if (user) {
				const token = await getJwtToken(user, process.env.JWT_RESET_SECRET as string, '20m');

				const updatedUser = await user?.updateOne({ resetLink: token });

				const mailData = {
					to: user?.email,
					subject: 'Reset Password',
					html: `
                        <h2>Reset Password using this link:</h2>
                        <p><a href="${process.env.CLIENT_URL}/resetpassword/${token}">Rest Password Link</a></p>
                    `,
				};
				if (await nodeMailer.sendMail(mailData))
					return res.status(200).json({ msg: 'Please check your registered Email ID', token, updatedUser });
			} else {
				return res.status(400).json({ err: 'Email Does not exist' });
			}
		} catch (err) {
			return res.status(400).json({ err: 'Password reset Failed, try again' });
		}
	};

	resetPassword = async (req: Request, res: Response) => {
		const { newPassword, token } = req.body;

		if (!newPassword || !token) {
			return res.status(400).json({ err: 'All fields are mandatory!' });
		}
		if (newPassword.length < 6) {
			return res.json({ err: 'Minimum password length is 6 characters' });
		}
		try {
			await verifyRefreshToken(token, <string>process.env.JWT_RESET_SECRET);

			const salt = await bcrypt.genSalt();
			const password = await bcrypt.hash(newPassword, salt);

			await User.findOneAndUpdate(
				{
					resetLink: token,
				},
				{
					password,
					resetLink: '',
				},
				{
					new: true,
					runValidators: true,
					context: 'query',
				},
				(err, doc) => {
					if (err || !doc) {
						console.log(err, doc);
						return res.status(400).json({ err: 'Password update failed, try again!!' });
					}
					return res.status(200).json({ msg: 'Password Updated Successfuly' });
				}
			);
		} catch (err) {
			return res.status(400).json({ err: 'Incorrect token sent - Authorization error' });
		}
	};

	sendOtpOnLogin = (req: Request, res: Response): void => {
		// console.log('receiving phone number for opt', req, res);
		res.json({ msg: 'req receive successfully' });
		// For development purposes we need to comment the below function
		// sendOTP(req, res);
	};

	// if correct userDocument arrives then no promise rejection occurs so
	// before using thid mehtod handle userdoc null promise rejection method before call this one
	generateTokensForUser = async (userDocument: IUser): Promise<any> => {
		const accessToken = await getJwtToken(userDocument, process.env.JWT_ACCESS_SECRET as string, '10m');
		const refreshToken = await getJwtToken(userDocument, process.env.JWT_REFRESH_SECRET as string, '1d');
		const user: BasicUser = await User.addRefreshToken(userDocument._id, refreshToken);
		console.log('User inside genereateToken: ', user);
		return new Promise((resolve) => {
			resolve({
				accessToken,
				refreshToken,
				user,
			});
		});
	};

	updateUserBasicInfoUtil = async (userObject: any) => {
		const { name, email, _id, phoneNumber, expoPushToken, address } = userObject;
		const data: any = {};
		if (name) data['name'] = name;
		if (email) data['email'] = email;
		if (phoneNumber) data['phoneNumber'] = phoneNumber;
		if (expoPushToken) data['expoPushToken'] = expoPushToken;
		if (address) data['address'] = address;
		if (!(Object.keys(data).length == 0)) {
			const result = await User.findOneAndUpdate({ _id }, data, {
				new: true,
				runValidators: true,
				context: 'query',
			});
			if (!result) {
				throw new Error('Invalid user detail');
			}
			return result;
		} else {
			throw new Error('Updating field mandatory');
		}
	};

	updateUserBasicInfo = (req: Request, res: Response) => {
		if (req.isAuth) {
			const { _id, name, email, phoneNumber, expoPushToken, address } = req.body;

			if (!_id || !verifyObjectId([_id])) {
				return res.status(403).json({ err: 'Invalid user Details' });
			}

			if (email && !validator.isEmail(email)) {
				return res.status(400).json({ err: 'email is not valid!' });
			}
			if (phoneNumber && !validator.isMobilePhone(`91${phoneNumber}`, 'en-IN')) {
				return res.status(400).json({ err: 'Phone number is not valid!' });
			}

			if (expoPushToken && !Expo.isExpoPushToken(expoPushToken)) {
				return res.status(400).json({ err: 'Invalid expo token!' });
			}
			const userObject = { _id, name, email, phoneNumber, expoPushToken, address };
			this.updateUserBasicInfoUtil(userObject)
				.then((data) => {
					const { _id, name, email, phoneNumber, userType, expoPushToken } = data;
					const updatedUserInfo: BasicUser = {
						_id,
						name,
						email,
						phoneNumber,
						userType,
						expoPushToken,
						address,
					};
					res.status(200).json({ updatedUserInfo });
				})
				.catch((err) => {
					res.status(400).json({ err: err.message });
				});
		} else {
			return res.status(403).json({ err: 'Not Authorized' });
		}
	};
}
