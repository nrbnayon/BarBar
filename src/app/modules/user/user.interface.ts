// src\app\modules\user\user.interface.ts

import { Model } from 'mongoose';
import { USER_ROLES } from '../../../enums/user';

export type IUser = {
  role: USER_ROLES;
  name: string;
  email: string;
  phone: string;
  password: string;
  postCode: string;
  address?: string;
  country?: string;
  appId?: string;
  fcmToken?: string;
  status:
    | 'active'
    | 'deactivate'
    | 'delete'
    | 'block'
    | 'pending'
    | 'inactive'
    | 'approved';
  verified: boolean;
  gender: 'male' | 'female' | 'both';
  dateOfBirth: Date;
  profileImage: string;
  image: string;
  onlineStatus?: boolean;
  lastActiveAt?: Date;
  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isAccountCreated(id: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;
} & Model<IUser>;
