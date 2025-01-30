import { Schema, model } from 'mongoose';
import { ISchedule, ScheduleModel } from './schedule.interface';

const scheduleSchema = new Schema<ISchedule, ScheduleModel>(
  {
    salonId: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    serviceDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

scheduleSchema.statics.isExistScheduleById = async function (id: string) {
  return await Schedule.findById(id);
};

export const Schedule = model<ISchedule, ScheduleModel>(
  'Schedule',
  scheduleSchema
);
