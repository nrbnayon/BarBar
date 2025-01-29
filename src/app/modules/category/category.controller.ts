import { NextFunction, Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { CategoryService } from './category.service';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const createCategoryToDB = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const value = { ...req.body };
    const result = await CategoryService.createCategoryToDB(value);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Category created successfully',
      data: result,
    });
  }
);

const getAllCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getAllCategory();
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category retrieved successfully',
    data: result,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getSingleCategory(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category retrieved successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const categoryId = req.params.id;
  const data = { ...req.body };
  console.log('Updating category...', data, req.body, categoryId);
  const result = await CategoryService.updateCategory(categoryId, data);

  console.log('Updated category', result);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category updated successfully',
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.deleteCategory(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Category deleted successfully',
    data: result,
  });
});

export const CategoryController = {
  createCategoryToDB,
  getAllCategory,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
