export type IVerifyEmail = {
  email: string;
  oneTimeCode: number;
};

export type ILoginData = {
  email: string;
  password: string;
};

export interface ISocialLoginData {
  email?: string;
  name?: string;
  type: 'social';
  appId?: string;
  fcmToken?: string;
  role: string;
  image?: string;
}

export type IAuthResetPassword = {
  newPassword: string;
  confirmPassword: string;
};

export type IChangePassword = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
