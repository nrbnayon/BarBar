// src/app/modules/salons/salon.model.ts
import { Schema, model } from 'mongoose';
import { BusinessHours, ISalon, SalonModel } from './salon.interface';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';

const locationSchema = new Schema({
  locationName: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
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

const salonSchema = new Schema<ISalon, SalonModel>(
  {
    name: {
      type: String,
      required: true,
    },
    passportNum: {
      type: String,
      required: true,
      unique: true,
    },
    address: { type: locationSchema },
    phone: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    bannerImage: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'both'],
      required: true,
    },
    businessHours: [businessHoursSchema],
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'rejected'],
      default: 'pending',
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
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
      'Salon already exists with this passport number!'
    );
  }
  next();
});

export const Salon = model<ISalon, SalonModel>('Salon', salonSchema);
