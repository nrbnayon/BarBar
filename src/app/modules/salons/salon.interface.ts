// src/app/modules/salons/salon.interface.ts
import { Model, Types } from 'mongoose';

export type Location = {
  locationName: string;
  latitude: number;
  longitude: number;
};

export type BusinessHours = {
  day: string;
  startTime: string;
  endTime: string;
  isOff: boolean;
};

export type StatusUpdateHistory = {
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  updatedAt: Date;
  remarks?: string;
};

export type ISalon = {
  name: string;
  passportNum: string;
  doc: string;
  address: Location;
  phone: string;
  image: string;
  bannerImage: string;
  gender: 'male' | 'female' | 'both';
  businessHours: BusinessHours[];
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  host: Types.ObjectId;
  category: Types.ObjectId;
  remarks: string;
  statusUpdateHistory?: StatusUpdateHistory[];
  rating?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

interface QueryParams extends Record<string, unknown> {
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const DEFAULT_BUSINESS_HOURS = [
  { day: 'Monday', startTime: '09:00', endTime: '17:00', isOff: false },
  { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isOff: false },
  { day: 'Wednesday', startTime: '09:00', endTime: '17:00', isOff: false },
  { day: 'Thursday', startTime: '09:00', endTime: '17:00', isOff: false },
  { day: 'Friday', startTime: '09:00', endTime: '17:00', isOff: true },
  { day: 'Saturday', startTime: '09:00', endTime: '17:00', isOff: false },
  { day: 'Sunday', startTime: '09:00', endTime: '17:00', isOff: false },
];

export type SalonModel = {
  isExistSalonById(id: string): Promise<ISalon | null>;
} & Model<ISalon>;
