// src\app\modules\notification\notification.interface.ts
import { Model, Types } from 'mongoose';

export type NotificationType = 'ADMIN' | 'HOST' | 'USER' | 'PAYMENT';

export interface INotification {
  message: string;
  receiver?: Types.ObjectId;
  read: boolean;
  type: NotificationType;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationFilters {
  searchTerm?: string;
  type?: NotificationType;
  read?: boolean;
  startDate?: Date;
  endDate?: Date;
  receiver?: string;
}

export type NotificationModel = Model<INotification>;

// import { Model, Types } from 'mongoose';

// export type INotification = {
//   text: string;
//   receiver?: Types.ObjectId;
//   read: boolean;
//   type?: string;
// };

// export type NotificationModel = Model<INotification>;
