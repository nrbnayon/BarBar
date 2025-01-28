// src\app\modules\userLog\userLog.interface.ts
export interface IUserLog {
  userId: string;
  email: string;
  device: string;
  browser: string;
  location: {
    ip: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  loginTime: Date;
  logoutTime?: Date;
  status: 'active' | 'logged_out';
}