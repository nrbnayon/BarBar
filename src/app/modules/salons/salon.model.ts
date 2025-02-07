// src/app/modules/salons/salon.model.ts
import { Schema, model } from 'mongoose';
import {
  BusinessHours,
  ISalon,
  SalonModel,
  StatusUpdateHistory,
} from './salon.interface';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';

const locationSchema = new Schema({
  locationName: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
});

const businessHoursSchema = new Schema<BusinessHours>({
  day: {
    type: String,
    enum: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
  },
  startTime: {
    type: String,
  },
  endTime: {
    type: String,
  },
  isOff: {
    type: Boolean,
    default: false,
  },
});

const statusUpdateHistorySchema = new Schema<StatusUpdateHistory>({
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'rejected'],
  },
  updatedAt: {
    type: Date,
  },
  remarks: {
    type: String,
  },
});

const salonSchema = new Schema<ISalon, SalonModel>(
  {
    name: {
      type: String,
    },

    passportNum: {
      type: String,
      required: true,
      unique: true,
    },

    doc: {
      type: String,
      default: '',
      required: true,
    },

    phone: {
      type: String,
    },
    image: {
      type: String,
      default: '',
    },
    
    rating: { type: Number, default: 0 },

    address: { type: locationSchema },

    gender: {
      type: String,
      enum: ['male', 'female', 'both'],
    },

    businessHours: [businessHoursSchema],

    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'rejected'],
      default: 'pending',
    },

    remarks: {
      type: String,
      default: 'Initial submission',
    },
    // statusUpdateHistory: [statusUpdateHistorySchema],
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
  },
  { timestamps: true }
);

salonSchema.statics.isExistSalonById = async function (id: string) {
  console.log('Checking salon existence by ID:', id);
  const salon = await Salon.findById(id);
  console.log('Salon found:', salon ? 'Yes' : 'No');
  return salon;
};

salonSchema.pre('save', async function (next) {
  console.log('Pre-save hook: Checking passport number:', this.passportNum);
  const isExist = await Salon.findOne({ passportNum: this.passportNum });
  if (isExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Salon already exists with this salon register number!'
    );
  }
  next();
});

export const Salon = model<ISalon, SalonModel>('Salon', salonSchema);
