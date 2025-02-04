// src/app/modules/product/product.controller.ts
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ProductService } from './product.service';
import { getFilePathMultiple } from '../../../shared/getFilePath';

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const hostId = req.user.id;

  const productData = {
    ...req.body,
    host: hostId,
  };

  if (req.files) {
    const images = getFilePathMultiple(req.files, 'images', 'image');
    if (images && images.length > 0) {
      productData.images = images;
    }
  }

  const result = await ProductService.createProduct(productData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Product created successfully',
    data: result,
  });
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const filters = req.query;
  const paginationOptions = {
    page: Number(req.query.page),
    limit: Number(req.query.limit),
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as 'asc' | 'desc',
  };

  const result = await ProductService.getAllProducts(
    filters,
    paginationOptions
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Products retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getProductById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Product retrieved successfully',
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const hostId = req.user.id;
  const productId = req.params.id;

  let updateData = { ...req.body };

  if (req.files) {
    const images = getFilePathMultiple(req.files, 'images', 'image');
    if (images && images.length > 0) {
      updateData.images = images;
    }
  }

  const result = await ProductService.updateProduct(
    productId,
    hostId,
    updateData
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Product updated successfully',
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const hostId = req.user.id;
  const result = await ProductService.deleteProduct(req.params.id, hostId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Product deleted successfully',
    data: result,
  });
});

const getSalonProducts = catchAsync(async (req: Request, res: Response) => {
  const { salonId } = req.params;
  const filters = req.query;
  const paginationOptions = {
    page: Number(req.query.page),
    limit: Number(req.query.limit),
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as 'asc' | 'desc',
  };

  const result = await ProductService.getSalonProducts(
    salonId,
    filters,
    paginationOptions
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Salon products retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSimilarProducts = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProductService.getSimilarProducts(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Similar products retrieved successfully',
    data: result,
  });
});


export const ProductController = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getSalonProducts,
  getSimilarProducts,
};
