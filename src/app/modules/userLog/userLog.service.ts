// src\app\modules\userLog\userLog.service.ts

import { Request } from 'express';
import axios from 'axios';
import { UAParser } from 'ua-parser-js';
import { IUserLog } from './userLog.interface';
import { UserLog } from './userLog.model';
import { logger } from '../../../shared/logger';

const createLoginLog = async (req: Request, userId: string, email: string) => {
  try {
    const parser = new UAParser(req.headers['user-agent']);
    const browserInfo = parser.getBrowser();
    const deviceInfo = parser.getDevice();

    // Get IP address
    const ip =
      req.headers['x-forwarded-for']?.toString() ||
      req.socket.remoteAddress?.toString() ||
      'unknown';

    // Get location info from IP
    const geoResponse = await axios.get(`http://ip-api.com/json/${ip}`);
    const locationData = geoResponse.data;

    const logData: Partial<IUserLog> = {
      userId,
      email,
      device: `${deviceInfo.vendor || ''} ${deviceInfo.model || ''} ${
        deviceInfo.type || 'Unknown Device'
      }`,
      browser: `${browserInfo.name || 'Unknown'} ${browserInfo.version || ''}`,
      location: {
        ip,
        city: locationData.city,
        country: locationData.country,
        latitude: locationData.lat,
        longitude: locationData.lon,
      },
      loginTime: new Date(),
      status: 'active',
    };

    const log = await UserLog.create(logData);
    logger.info(`User login logged - UserID: ${userId}, IP: ${ip}`);
    return log;
  } catch (error) {
    logger.error('Error creating login log:', error);
    throw error;
  }
};

const updateLogoutTime = async (userId: string) => {
  try {
    const log = await UserLog.findOneAndUpdate(
      { userId, status: 'active' },
      {
        logoutTime: new Date(),
        status: 'logged_out',
      },
      { new: true }
    );
    logger.info(`User logout logged - UserID: ${userId}`);
    return log;
  } catch (error) {
    logger.error('Error updating logout time:', error);
    throw error;
  }
};

const getUserLogs = async (userId: string) => {
  try {
    const logs = await UserLog.find({ userId }).sort({ loginTime: -1 }).lean();
    return logs;
  } catch (error) {
    logger.error('Error fetching user logs:', error);
    throw error;
  }
};

export const UserLogService = {
  createLoginLog,
  updateLogoutTime,
  getUserLogs,
};