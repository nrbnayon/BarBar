// src\app\modules\schedule\schedule.interface.ts
import { Model, Types } from 'mongoose';

export type ISchedule = {
  salonId: Types.ObjectId;
  userId: Types.ObjectId;
  serviceDate: Date;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt?: Date;
  updatedAt?: Date;
};

export type ScheduleModel = {
  isExistScheduleById(id: string): Promise<ISchedule | null>;
} & Model<ISchedule>;
