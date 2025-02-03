// src\app\modules\cardPayment\card.service.ts
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { ICard } from './card.interface';
import mongoose, { Types } from 'mongoose';
import { Card } from './card.model';
import { getLastFourDigits, isExpiryDateValid, validateCardNumber } from '../../../util/cardUtils';

const addCard = async (userId: string, payload: ICard): Promise<ICard> => {
  // Validate card number format
  if (!validateCardNumber(payload.cardNumber, payload.cardType)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid card number for the specified card type'
    );
  }

  // Validate expiry date
  if (!isExpiryDateValid(payload.expiryDate)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Card has expired or expiry date is invalid'
    );
  }

  const session = await mongoose.startSession();
  let card: ICard;

  try {
    session.startTransaction();

    const lastFourDigits = getLastFourDigits(payload.cardNumber);

    // Check if card already exists for this user
    const existingCard = await Card.findOne({
      user: userId,
      lastFourDigits: lastFourDigits,
      cardType: payload.cardType,
    }).session(session);

    if (existingCard) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'This card is already registered for this user'
      );
    }

    // Create new card if no duplicate found
    const newCard = await Card.create(
      [
        {
          ...payload,
          user: userId,
          lastFourDigits,
          isDefault: payload.isDefault ?? false,
        },
      ],
      { session }
    );

    // If this is the first card or isDefault is true, make it the default
    if (payload.isDefault) {
      await Card.updateMany(
        {
          user: userId,
          _id: { $ne: newCard[0]._id },
        },
        { isDefault: false },
        { session }
      );
    }

    await session.commitTransaction();
    card = newCard[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

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
