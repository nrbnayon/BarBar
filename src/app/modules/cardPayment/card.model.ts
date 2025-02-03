import { Schema, model } from 'mongoose';
import { CardModel, ICard } from './card.interface';
import { encryptCardNumber } from '../../../util/cardUtils';

const cardSchema = new Schema<ICard>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cardHolderName: {
      type: String,
      required: true,
    },
    cardNumber: {
      type: String,
      required: true,
      set: encryptCardNumber,
    },
    cardType: {
      type: String,
      enum: ['visa', 'mastercard', 'paypal'],
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
    },
    phone: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    lastFourDigits: {
      type: String,
      required: true,
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
