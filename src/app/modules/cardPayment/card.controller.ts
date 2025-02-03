import { Request, Response } from 'express';
import { CardService } from './card.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

const addCard = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await CardService.addCard(userId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Card added successfully',
    data: result,
  });
});

const getAllCards = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await CardService.getAllCards(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Cards retrieved successfully',
    data: result,
  });
});

const getCardById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { cardId } = req.params;
  const result = await CardService.getCardById(userId, cardId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Card retrieved successfully',
    data: result,
  });
});

const updateCard = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { cardId } = req.params;
  const result = await CardService.updateCard(userId, cardId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Card updated successfully',
    data: result,
  });
});

const deleteCard = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { cardId } = req.params;
  await CardService.deleteCard(userId, cardId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Card deleted successfully',
  });
});

const setDefaultCard = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { cardId } = req.params;
  const result = await CardService.setDefaultCard(userId, cardId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Default card set successfully',
    data: result,
  });
});

export const CardController = {
  addCard,
  getAllCards,
  getCardById,
  updateCard,
  deleteCard,
  setDefaultCard,
};
