import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { ITransaction } from './transaction.interface';
import { Transaction } from './transaction.model';
import { Appointment } from '../appointments/appointment.model';
import { Product } from '../product/product.model';
import { Card } from '../cardPayment/card.model';
import { sendNotifications } from '../../../helpers/notificationHelper';

const processPayment = async (
  userId: string,
  payload: {
    type: 'appointment' | 'product';
    itemId: string;
    cardId: string;
    quantity?: number;
  }
): Promise<ITransaction> => {
  const { type, itemId, cardId, quantity = 1 } = payload;

  // Get user's card
  const userCard = await Card.findOne({
    _id: cardId,
    user: userId,
  });

  if (!userCard) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User card not found');
  }

  let amount: number;
  let hostId: string;
  let description: string;
  let referenceItem: any;

  // Handle different payment types
  if (type === 'appointment') {
    const appointment = await Appointment.findById(itemId)
      .populate('service')
      .populate({
        path: 'salon',
        populate: {
          path: 'host',
        },
      });

    if (!appointment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Appointment not found');
    }

    amount = appointment.price;
    hostId = appointment.salon.host._id;
    description = `Payment for ${appointment.service.name} at ${appointment.salon.name}`;
    referenceItem = appointment;
  } else {
    // Product payment
    const product = await Product.findById(itemId).populate('host');
    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
    }

    amount = product.price * quantity;
    hostId = product.host._id;
    description = `Payment for ${quantity}x ${product.name}`;
    referenceItem = product;
  }

  // Get host's default card
  const hostCard = await Card.findOne({
    user: hostId,
    isDefault: true,
  });

  if (!hostCard) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Host has not set up payment information'
    );
  }

  // Create transaction
  const transaction = await Transaction.create({
    user: userId,
    host: hostId,
    [type]: itemId,
    amount,
    userCard: cardId,
    hostCard: hostCard._id,
    transactionType: type,
    status: 'pending',
    transactionId: generateTransactionId(),
    description,
  });

  try {
    // Process payment (implement payment gateway integration here)

    if (type === 'appointment') {
      // Update appointment status
      await Appointment.findByIdAndUpdate(itemId, {
        'payment.status': 'paid',
        'payment.transactionId': transaction.transactionId,
        status: 'confirmed',
      });
    } else {
      // Update product inventory
      await Product.findByIdAndUpdate(itemId, {
        $inc: { stock: -quantity },
      });
    }

    // Update transaction status
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transaction._id,
      {
        status: 'completed',
        paymentDate: new Date(),
      },
      { new: true }
    );

    // Send notifications
    await sendNotifications({
      userId: hostId,
      title: 'Payment Received',
      message: `You received a payment of $${amount} for ${type} #${itemId}`,
      type: 'PAYMENT',
    });

    await sendNotifications({
      userId,
      title: 'Payment Successful',
      message: `Your payment of $${amount} for ${type} #${itemId} was successful`,
      type: 'PAYMENT',
    });

    return updatedTransaction!;
  } catch (error) {
    await Transaction.findByIdAndUpdate(transaction._id, {
      status: 'failed',
    });

    throw new ApiError(
      StatusCodes.PAYMENT_REQUIRED,
      'Payment processing failed'
    );
  }
};

const getTransactionHistory = async (
  userId: string,
  role: 'user' | 'host'
): Promise<ITransaction[]> => {
  const query = role === 'user' ? { user: userId } : { host: userId };

  const transactions = await Transaction.find(query)
    .populate('appointment')
    .populate('product')
    .populate('userCard')
    .populate('hostCard')
    .sort({ createdAt: -1 });

  return transactions;
};

const getTransactionById = async (
  userId: string,
  transactionId: string
): Promise<ITransaction> => {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    $or: [{ user: userId }, { host: userId }],
  })
    .populate('appointment')
    .populate('product')
    .populate('userCard')
    .populate('hostCard');

  if (!transaction) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Transaction not found');
  }

  return transaction;
};

export const TransactionService = {
  processPayment,
  getTransactionHistory,
  getTransactionById,
};
