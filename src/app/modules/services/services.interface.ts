// src/app/modules/services/services.interface.ts
import { Model, Types } from 'mongoose';

export type IService = {
  name: string;
  image: string;
  description: string;
  duration: number;
  price: number;
  maxAppointmentsPerSlot: number;
  salon: Types.ObjectId;
  category: Types.ObjectId;
  status: 'active' | 'inactive';
  rating?: number;
  reviewCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ServiceModel = {
  isServiceExists(id: string): Promise<IService | null>;
} & Model<IService>;
