// src\app\modules\payment\payment.service.ts
import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { Cart } from '../cart/cart.model';
import { Card } from '../cardPayment/card.model';
import { IPayment, ISalonPayment, PaymentFilters } from './payment.interface';
import { Payment } from './payment.model';
import { Product } from '../product/product.model';
import { sendNotifications } from '../../../helpers/notificationHelper';
import { Types } from 'mongoose';

const stripe = new Stripe(config.payment.stripe_secret_key as string, {
  apiVersion: '2024-09-30.acacia',
});

const calculateSalonPayments = (products: any[]): ISalonPayment[] => {
  const salonPaymentsMap = new Map<string, ISalonPayment>();

  products.forEach(item => {
    const salonId = item.salon.toString();
    if (!salonPaymentsMap.has(salonId)) {
      salonPaymentsMap.set(salonId, {
        salon: item.salon,
        host: item.host,
        amount: 0,
        products: [],
      });
    }

    const salonPayment = salonPaymentsMap.get(salonId)!;
    const productAmount = item.price * item.quantity;
    salonPayment.amount += productAmount;
    salonPayment.products.push(item);
  });

  return Array.from(salonPaymentsMap.values());
};

const createPayment = async (
  userId: string,
  cartId: string,
  paymentMethod: string,
  cardId?: string
): Promise<
  IPayment | { clientSecret: string; transactionId: string; amount: number }
> => {
  const cart = await Cart.findOne({
    _id: cartId,
    user: userId,
    status: 'active',
  }).populate('items.product');

  if (!cart) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Active cart not found');
  }

  // Validate products and calculate total
  let totalAmount = 0;
  const products = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Product not found: ${item.product}`
      );
    }

    if (product.quantity < item.quantity) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Insufficient quantity for product: ${product.name}`
      );
    }

    totalAmount += product.price * item.quantity;
    products.push({
      productId: product._id,
      quantity: item.quantity,
      price: product.price,
      salon: item.salon,
      host: item.host,
    });
  }

  // Calculate payments for each salon
  const salonPayments = calculateSalonPayments(products);

  if (paymentMethod === 'cash') {
    const payment = await Payment.create({
      amount: totalAmount,
      user: userId,
      products,
      paymentMethod,
      status: 'pending',
      salonPayments,
    });

    // Send notifications to all salon hosts
    for (const salonPayment of salonPayments) {
      await sendNotifications({
        userId: salonPayment.host.toString(),
        message: `New cash payment received for ${salonPayment.amount} USD`,
        type: 'PAYMENT',
      });
    }

    return payment;
  }

  // Handle card payments
  if (!cardId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Card ID is required for card payments'
    );
  }

  const card = await Card.findOne({ _id: cardId, user: userId });
  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Card not found');
  }

  // Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalAmount * 100),
    currency: 'usd',
    payment_method_types: ['card'],
    metadata: {
      cartId,
      userId,
      cardId,
    },
  });

  // Create payment record
  await Payment.create({
    amount: totalAmount,
    user: userId,
    products,
    paymentMethod,
    cardId,
    status: 'pending',
    transactionId: paymentIntent.id,
    client_secret: paymentIntent.client_secret,
    salonPayments,
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    transactionId: paymentIntent.id,
    amount: totalAmount,
  };
};

const confirmPayment = async (
  userId: string,
  paymentIntentId: string
): Promise<IPayment> => {
  const payment = await Payment.findOne({
    transactionId: paymentIntentId,
    user: userId,
  });

  console.log('Get payment::', payment);
  if (!payment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status === 'succeeded') {
    payment.status = 'completed';
    await payment.save();

    // Update product quantities
    for (const item of payment.products) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: -(item.quantity || 0) },
      });
    }

    // Send notifications to all salon hosts
    for (const salonPayment of payment.salonPayments) {
      await sendNotifications({
        userId: salonPayment.host.toString(),
        message: `Payment of ${salonPayment.amount} USD has been confirmed`,
        type: 'PAYMENT',
      });
    }

    return payment;
  }

  payment.status = 'failed';
  await payment.save();
  throw new ApiError(StatusCodes.BAD_REQUEST, 'Payment failed');
};

const getUserPayments = async (userId: string): Promise<IPayment[]> => {
  return Payment.find({ user: userId })
    .populate('products.productId')
    .populate('salonPayments.salon')
    .populate('salonPayments.host')
    .sort({ createdAt: -1 });
};

const getHostPayments = async (hostId: string): Promise<IPayment[]> => {
  return Payment.find({
    'salonPayments.host': hostId,
  })
    .populate('products.productId')
    .populate('user')
    .populate('salonPayments.salon')
    .sort({ createdAt: -1 });
};

const getAllPaymentsFromDB = async (filters: PaymentFilters) => {
  const { searchTerm, status, paymentMethod, salon, host, startDate, endDate } =
    filters;
  const query: any = {};

  if (searchTerm) {
    query.$or = [{ transactionId: { $regex: searchTerm, $options: 'i' } }];
  }

  if (status) {
    query.status = status;
  }

  if (paymentMethod) {
    query.paymentMethod = paymentMethod;
  }

  if (salon) {
    query['salonPayments.salon'] = new Types.ObjectId(salon);
  }

  if (host) {
    query['salonPayments.host'] = new Types.ObjectId(host);
  }

  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const payments = await Payment.find(query)
    .populate('user', 'name email')
    .populate('products.productId', 'name price')
    .populate('salonPayments.salon', 'name')
    .populate('salonPayments.host', 'name')
    .sort({ createdAt: -1 });

  return payments;
};

export const PaymentService = {
  createPayment,
  confirmPayment,
  getUserPayments,
  getHostPayments,
  getAllPaymentsFromDB,
};

