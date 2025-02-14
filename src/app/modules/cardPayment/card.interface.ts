// src\app\modules\cardPayment\card.interface.ts
import { Model, Types } from 'mongoose';

export type CardType = 'visa' | 'card'| 'mastercard' | 'paypal';

export type ICard = {
  user: Types.ObjectId;
  cardHolderName: string;
  cardNumber: string;
  cardType: CardType;
  expiryDate: string;
  cvv: string;
  email: string;
  phone: string;
  isDefault: boolean;
  lastFourDigits: string;
};

export type CardModel = Model<ICard>;
