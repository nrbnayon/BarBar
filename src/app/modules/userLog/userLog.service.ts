import { Request, Response } from 'express';
import axios from 'axios';
import { UAParser } from 'ua-parser-js';
import { IUserLog } from './userLog.interface';
import { UserLog } from './userLog.model';
import { logger } from '../../../shared/logger';

const createLoginLog = async (req: Request, userId: string, email: string) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);

    const browserInfo = parser.getBrowser();
    const osInfo = parser.getOS();
    const deviceInfo = parser.getDevice();

    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket.remoteAddress?.replace('::ffff:', '') ||
      'unknown';

    const deviceString = [
      deviceInfo.vendor,
      deviceInfo.model,
      deviceInfo.type || 'Desktop',
      osInfo.name,
      osInfo.version,
    ]
      .filter(Boolean)
      .join(' ');

    // Check for an existing active log for the same device and IP
    const existingLog = await UserLog.findOne({
      userId,
      status: 'active',
      'location.ip': ip,
      device: deviceString,
    });

    if (existingLog) {
      // Update the login time of the existing log
      existingLog.loginTime = new Date();
      await existingLog.save();
      logger.info(
        `Existing login log updated - UserID: ${userId}, IP: ${ip}, Device: ${deviceString}`
      );
      return existingLog;
    }

    // Fetch location data only if we need to create a new log
    let locationData = { city: 'Unknown', country: 'Unknown', lat: 0, lon: 0 };
    if (ip !== 'localhost' && ip !== '127.0.0.1') {
      try {
        const geoResponse = await axios.get(`http://ip-api.com/json/${ip}`);
        locationData = geoResponse.data;
      } catch (error) {
        logger.error('Error fetching location data:', error);
      }
    }

    // Create a new log if no existing log is found
    const logData: Partial<IUserLog> = {
      userId,
      email,
      device: deviceString || 'Unknown Device',
      browser: `${browserInfo.name || 'Unknown'} ${
        browserInfo.version || ''
      }`.trim(),
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

    const newLog = await UserLog.create(logData);
    logger.info(
      `New user login logged - UserID: ${userId}, IP: ${ip}, Device: ${deviceString}`
    );
    return newLog;
  } catch (error) {
    logger.error('Error creating login log:', error);
    throw error;
  }
};

const updateLogoutTime = async (
  userId: string,
  res: Response,
  logId?: string,
  deviceInfo?: { userAgent: string; ip: string }
) => {
  try {
    const query: any = { userId, status: 'active' };

    if (logId) {
      // If logId is provided, update only that specific log
      query._id = logId;
    } else if (deviceInfo) {
      // If deviceInfo is provided, update the log for the specific device and IP
      const parser = new UAParser(deviceInfo.userAgent);
      const osInfo = parser.getOS();
      const deviceInfoParsed = parser.getDevice();

      const deviceString = [
        deviceInfoParsed.vendor,
        deviceInfoParsed.model,
        deviceInfoParsed.type || 'Desktop',
        osInfo.name,
        osInfo.version,
      ]
        .filter(Boolean)
        .join(' ');

      query['location.ip'] = deviceInfo.ip;
      query.device = deviceString;
    }
    // If neither logId nor deviceInfo is provided, it will log out all active sessions for the user

    const update = {
      logoutTime: new Date(),
      status: 'logged_out',
    };

    const result = await UserLog.updateMany(query, update);
    await UserLog.deleteMany(query, update);

    // Clear cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    logger.info(
      `User logout logged - UserID: ${userId}${
        logId
          ? `, LogID: ${logId}`
          : deviceInfo
          ? ', Specific device'
          : ' (all sessions)'
      }`
    );
    return result;
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

const getActiveSessions = async (userId: string) => {
  try {
    const logs = await UserLog.find({
      userId,
      status: 'active',
    })
      .sort({ loginTime: -1 })
      .lean();
    return logs;
  } catch (error) {
    logger.error('Error fetching active sessions:', error);
    throw error;
  }
};

export const UserLogService = {
  createLoginLog,
  updateLogoutTime,
  getUserLogs,
  getActiveSessions,
};
