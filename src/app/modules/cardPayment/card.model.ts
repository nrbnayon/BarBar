// src\app\modules\cardPayment\card.model.ts
import { Schema, model } from 'mongoose';
import { CardModel, ICard } from './card.interface';
import { encryptCardNumber } from '../../../util/cardUtils';

const cardSchema = new Schema<ICard>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cardHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    cardNumber: {
      type: String,
      required: true,
      set: encryptCardNumber,
      select: false,
    },
    cardType: {
      type: String,
      enum: ['card', 'visa', 'mastercard', 'paypal'],
      required: true,
    },
    expiryDate: {
      type: String,
      required: true,
    },
    cvv: {
      type: String,
      required: true,
      select: false,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    lastFourDigits: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.cardNumber;
        delete ret.cvv;
        return ret;
      },
    },
  }
);

cardSchema.index(
  {
    user: 1,
    lastFourDigits: 1,
    cardType: 1,
  },
  {
    unique: true,
    name: 'unique_user_card',
  }
);
// Ensure only one default card per user
cardSchema.pre('save', async function (next) {
  if (this.isDefault) {
    await this.model('Card').updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

export const Card = model<ICard, CardModel>('Card', cardSchema);
