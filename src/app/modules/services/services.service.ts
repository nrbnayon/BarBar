// src\app\modules\services\services.service.ts
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Service } from './services.model';
import { IService } from './services.interface';

const createService = async (payload: IService): Promise<IService> => {
  const result = await Service.create(payload);
  return result;
};

const getAllServices = async (
  salonId: string,
  filters: Record<string, unknown>
) => {
  const { searchTerm, ...filterData } = filters;
  const conditions: any[] = [{ salon: salonId }];

  if (searchTerm) {
    conditions.push({
      $or: [
        { name: { $regex: searchTerm.toString(), $options: 'i' } },
        { description: { $regex: searchTerm.toString(), $options: 'i' } },
      ],
    });
  }

  if (Object.keys(filterData).length) {
    conditions.push(filterData);
  }

  const result = await Service.find({ $and: conditions })
    .populate('category')
    .lean();

  return result;
};

const getServiceById = async (id: string): Promise<IService | null> => {
  const result = await Service.findById(id).populate('category');
  return result;
};

const updateService = async (
  id: string,
  payload: Partial<IService>
): Promise<IService | null> => {
  const service = await Service.isServiceExists(id);
  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found');
  }

  const result = await Service.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteService = async (id: string): Promise<IService | null> => {
  const result = await Service.findByIdAndDelete(id);
  return result;
};

export const ServiceService = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
};