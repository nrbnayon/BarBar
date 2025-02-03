import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { ICard } from './card.interface';
import { Card } from './card.model';
import { Types } from 'mongoose';
import { getLastFourDigits } from '../../../util/cardUtils';

const addCard = async (userId: string, payload: ICard): Promise<ICard> => {
  // Extract last four digits before encryption
  const lastFourDigits = getLastFourDigits(payload.cardNumber);

  const card = await Card.create({
    ...payload,
    user: userId,
    lastFourDigits,
    isDefault: payload.isDefault ?? false,
  });

  return card;
};

const getAllCards = async (userId: string): Promise<ICard[]> => {
  const cards = await Card.find({ user: userId }).sort({ createdAt: -1 });
  return cards;
};

const getCardById = async (userId: string, cardId: string): Promise<ICard> => {
  const card = await Card.findOne({
    _id: cardId,
    user: userId,
  });

  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found');
  }

  return card;
};

const updateCard = async (
  userId: string,
  cardId: string,
  payload: Partial<ICard>
): Promise<ICard> => {
  const card = await Card.findOne({
    _id: cardId,
    user: userId,
  });

  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found');
  }

  const updatedCard = await Card.findByIdAndUpdate(cardId, payload, {
    new: true,
  });

  if (!updatedCard) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to update card');
  }

  return updatedCard;
};

const deleteCard = async (userId: string, cardId: string): Promise<void> => {
  const card = await Card.findOne({
    _id: cardId,
    user: userId,
  });

  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found');
  }

  await Card.findByIdAndDelete(cardId);
};

const setDefaultCard = async (
  userId: string,
  cardId: string
): Promise<ICard> => {
  const card = await Card.findOne({
    _id: cardId,
    user: userId,
  });

  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found');
  }

  // Remove default from all other cards
  await Card.updateMany(
    { user: new Types.ObjectId(userId) },
    { isDefault: false }
  );

  // Set this card as default
  const updatedCard = await Card.findByIdAndUpdate(
    cardId,
    { isDefault: true },
    { new: true }
  );

  if (!updatedCard) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to set default card'
    );
  }

  return updatedCard;
};

export const CardService = {
  addCard,
  getAllCards,
  getCardById,
  updateCard,
  deleteCard,
  setDefaultCard,
};
