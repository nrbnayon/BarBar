export interface ILocation {
  ip: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface IUserLog {
  userId: string;
  email: string;
  device: string;
  browser: string;
  location: ILocation;
  loginTime: Date;
  logoutTime?: Date;
  status: 'active' | 'logged_out';
}
