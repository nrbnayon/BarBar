// src\app\modules\services\services.model.ts
import { Schema, model } from 'mongoose';
import { IService, ServiceModel } from './services.interface';

const serviceSchema = new Schema<IService, ServiceModel>(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default:
        'https://qc.cdn.data.nasdaq.com/assets/images/hero-bkg-764e08457f41a9cdc00603bd399e6195.jpg',
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 15,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    maxAppointmentsPerSlot: {
      type: Number,
      min: 1,
    },
    salon: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

serviceSchema.statics.isServiceExists = async function (id: string) {
  return await Service.findById(id);
};

export const Service = model<IService, ServiceModel>('Service', serviceSchema);