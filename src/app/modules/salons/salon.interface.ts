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

export type ISalon = {
  name: string;
  passportNum: string;
  address: Location;
  phone: string;
  image: string;
  bannerImage: string;
  gender: 'male' | 'female' | 'both';
  businessHours: BusinessHours[];
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  host: Types.ObjectId;
  category: Types.ObjectId;
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

export type SalonModel = {
  isExistSalonById(id: string): Promise<ISalon | null>;
} & Model<ISalon>;
