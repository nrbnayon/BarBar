// src\app\modules\cart\cart.service.ts
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { Product } from '../product/product.model';
import { Cart } from './cart.model';
import { ICart } from './cart.interface';

const calculateCartSummary = (cart: ICart) => {
  const totalItems = cart.items.length;
  const totalQuantity = cart.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalAmount = subtotal + cart.deliveryFee;

  return { totalItems, totalQuantity, subtotal, totalAmount };
};

const validateProduct = async (productId: string, quantity: number) => {
  const product = await Product.findOne({ _id: productId, status: 'active' });

  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found or inactive');
  }

  if (product.quantity < quantity) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Insufficient product quantity'
    );
  }

  return product;
};

const calculateDeliveryDates = () => {
  const now = new Date();

  const deliveryStart = new Date();
  deliveryStart.setDate(now.getDate() + 2);

  const deliveryEnd = new Date();
  deliveryEnd.setDate(now.getDate() + 4);

  return {
    estimatedDeliveryStart: deliveryStart.toISOString(),
    estimatedDeliveryEnd: deliveryEnd.toISOString(),
  };
};

const createNewCart = async (
  userId: string,
  product: any,
  quantity: number,
  session: mongoose.ClientSession
) => {
  const { estimatedDeliveryStart, estimatedDeliveryEnd } =
    calculateDeliveryDates();

  const cart = await Cart.create(
    [
      {
        user: userId,
        salon: product.salon,
        items: [
          {
            product: product._id,
            quantity,
            price: product.price,
            salon: product.salon,
            host: product.host,
            estimatedDeliveryStart: new Date(estimatedDeliveryStart),
            estimatedDeliveryEnd: new Date(estimatedDeliveryEnd),
          },
        ],
        deliveryFee: 10,
        status: 'active',
        totalAmount: product.price * quantity + 10,
      },
    ],
    { session }
  );

  if (!cart || cart.length === 0) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to create cart'
    );
  }

  return cart[0];
};

const populateCartDetails = async (cartId: mongoose.Types.ObjectId) => {
  const populatedCart = await Cart.findById(cartId).populate([
    {
      path: 'items.product',
      select: 'name images price',
    },
    {
      path: 'items.salon',
      select: 'name address',
    },
    {
      path: 'items.host',
      select: 'name email',
    },
  ]);

  if (!populatedCart) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to retrieve cart'
    );
  }

  return {
    ...populatedCart.toObject(),
    ...calculateCartSummary(populatedCart),
  };
};

// Main Cart Functions
const addToCartMultiSalon = async (
  userId: string,
  productId: string,
  quantity: number
): Promise<ICart> => {
  if (!userId || !productId || !quantity) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing required parameters');
  }
  if (quantity < 1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Quantity must be greater than 0'
    );
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const product = await validateProduct(productId, quantity);
    let cart = await Cart.findOne({ user: userId, status: 'active' });

    if (!cart) {
      cart = await createNewCart(userId, product, quantity, session);
    } else {
      const existingItemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );

      if (existingItemIndex > -1) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Product already exists in cart. Please update quantity.'
        );
      }

      const { estimatedDeliveryStart, estimatedDeliveryEnd } =
        calculateDeliveryDates();

      cart.items.push({
        product: product._id,
        quantity,
        price: product.price,
        salon: product.salon,
        host: product.host,
        estimatedDeliveryStart: new Date(estimatedDeliveryStart),
        estimatedDeliveryEnd: new Date(estimatedDeliveryEnd),
      });

      const { totalAmount } = calculateCartSummary(cart);
      cart.totalAmount = totalAmount;

      await cart.save({ session });
    }

    await session.commitTransaction();
    return await populateCartDetails(cart._id);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

const addToCartSingleSalon = async (
  userId: string,
  productId: string,
  quantity: number
): Promise<ICart> => {
  if (!userId || !productId || !quantity) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing required parameters');
  }
  if (quantity < 1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Quantity must be greater than 0'
    );
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const product = await validateProduct(productId, quantity);
    let cart = await Cart.findOne({ user: userId, status: 'active' });

    if (!cart) {
      cart = await createNewCart(userId, product, quantity, session);
    } else {
      if (
        cart.items.length > 0 &&
        cart.items[0].salon.toString() !== product.salon.toString()
      ) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Cannot add products from different salons to the same cart'
        );
      }

      const existingItemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );

      if (existingItemIndex > -1) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Product already exists in cart. Please update quantity.'
        );
      }

      const { estimatedDeliveryStart, estimatedDeliveryEnd } =
        calculateDeliveryDates();

      cart.items.push({
        product: product._id,
        quantity,
        price: product.price,
        salon: product.salon,
        host: product.host,
        estimatedDeliveryStart: new Date(estimatedDeliveryStart),
        estimatedDeliveryEnd: new Date(estimatedDeliveryEnd),
      });

      const { totalAmount } = calculateCartSummary(cart);
      cart.totalAmount = totalAmount;

      await cart.save({ session });
    }

    await session.commitTransaction();
    return await populateCartDetails(cart._id);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

const getCart = async (userId: string): Promise<ICart | null> => {
  const cart = await Cart.findOne({ user: userId, status: 'active' })
    .populate('items.product', 'name images price')
    .populate('items.salon', 'name address')
    .populate('items.host', 'name email');

  return cart ? { ...cart.toObject(), ...calculateCartSummary(cart) } : null;
};

const updateCartItem = async (
  userId: string,
  productId: string,
  quantity: number
): Promise<ICart> => {
  const cart = await Cart.findOne({ user: userId, status: 'active' });
  if (!cart) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Cart not found');
  }

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );
  if (itemIndex === -1) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found in cart');
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
  }

  if (product.quantity < quantity) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Insufficient product quantity'
    );
  }

  cart.items[itemIndex].quantity = quantity;
  const { totalAmount } = calculateCartSummary(cart);
  cart.totalAmount = totalAmount;

  const updatedCart = await cart.save();
  const populatedCart = await Cart.findById(updatedCart._id).populate([
    { path: 'items.product', select: 'name images price' },
    { path: 'items.salon', select: 'name address' },
    { path: 'items.host', select: 'name email' },
  ]);

  if (!populatedCart) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to update cart'
    );
  }

  return {
    ...populatedCart.toObject(),
    ...calculateCartSummary(populatedCart),
  };
};

const removeCartItem = async (
  userId: string,
  productId: string
): Promise<ICart> => {
  const cart = await Cart.findOne({ user: userId, status: 'active' });
  if (!cart) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Cart not found');
  }

  cart.items = cart.items.filter(item => item.product.toString() !== productId);
  const { totalAmount } = calculateCartSummary(cart);
  cart.totalAmount = totalAmount;

  const updatedCart = await cart.save();
  const populatedCart = await Cart.findById(updatedCart._id).populate([
    { path: 'items.product', select: 'name images price' },
    { path: 'items.salon', select: 'name address' },
    { path: 'items.host', select: 'name email' },
  ]);

  if (!populatedCart) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to update cart'
    );
  }

  return {
    ...populatedCart.toObject(),
    ...calculateCartSummary(populatedCart),
  };
};

const clearCart = async (userId: string): Promise<void> => {
  const cart = await Cart.findOne({ user: userId, status: 'active' });
  if (!cart) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Cart not found');
  }

  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();
};

export const CartService = {
  addToCartMultiSalon,
  addToCartSingleSalon,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};

// import { StatusCodes } from 'http-status-codes';
// import mongoose from 'mongoose';
// import ApiError from '../../../errors/ApiError';
// import { Product } from '../product/product.model';
// import { Cart } from './cart.model';
// import { ICart } from './cart.interface';

// const addToCart = async (
//   userId: string,
//   productId: string,
//   quantity: number
// ): Promise<ICart> => {
//   const session = await mongoose.startSession();
//   try {
//     session.startTransaction();

//     const product = await Product.findOne({ _id: productId, status: 'active' });
//     if (!product) {
//       throw new ApiError(
//         StatusCodes.NOT_FOUND,
//         'Product not found or inactive'
//       );
//     }

//     if (product.quantity < quantity) {
//       throw new ApiError(
//         StatusCodes.BAD_REQUEST,
//         'Insufficient product quantity'
//       );
//     }

//     let cart = await Cart.findOne({ user: userId, status: 'active' });

//     if (!cart) {
//       const newCart = await Cart.create(
//         [
//           {
//             user: userId,
//             items: [
//               {
//                 product: product._id,
//                 quantity,
//                 price: product.price,
//                 salon: product.salon,
//                 host: product.host,
//               },
//             ],
//             totalAmount: product.price * quantity,
//           },
//         ],
//         { session }
//       );

//       if (!newCart || newCart.length === 0) {
//         throw new ApiError(
//           StatusCodes.INTERNAL_SERVER_ERROR,
//           'Failed to create cart'
//         );
//       }

//       cart = newCart[0];
//     } else {
//       // Check if product already exists in cart
//       const existingItemIndex = cart.items.findIndex(
//         item => item.product.toString() === productId
//       );

//       if (existingItemIndex > -1) {
//         // Instead of updating quantity, throw an error
//         throw new ApiError(
//           StatusCodes.BAD_REQUEST,
//           'Product already exists in cart. Please use update quantity feature to modify existing items.'
//         );
//       }

//       // Add new item if product doesn't exist
//       cart.items.push({
//         product: product._id,
//         quantity,
//         price: product.price,
//         salon: product.salon,
//         host: product.host,
//       });

//       // Recalculate total amount
//       cart.totalAmount = cart.items.reduce(
//         (total, item) => total + item.price * item.quantity,
//         0
//       );

//       await cart.save({ session });
//     }

//     await session.commitTransaction();

//     const populatedCart = await Cart.findById(cart._id).populate([
//       { path: 'items.product', select: 'name images price' },
//       { path: 'items.salon', select: 'name address' },
//       { path: 'items.host', select: 'name email' },
//     ]);

//     if (!populatedCart) {
//       throw new ApiError(
//         StatusCodes.INTERNAL_SERVER_ERROR,
//         'Failed to retrieve cart'
//       );
//     }

//     return populatedCart;
//   } catch (error) {
//     await session.abortTransaction();
//     throw error;
//   } finally {
//     session.endSession();
//   }
// };

// const getCart = async (userId: string): Promise<ICart | null> => {
//   const cart = await Cart.findOne({ user: userId, status: 'active' })
//     .populate('items.product', 'name images price')
//     .populate('items.salon', 'name address')
//     .populate('items.host', 'name email');

//   return cart;
// };

// const updateCartItem = async (
//   userId: string,
//   productId: string,
//   quantity: number
// ): Promise<ICart> => {
//   const cart = await Cart.findOne({ user: userId, status: 'active' });
//   if (!cart) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'Cart not found');
//   }

//   const itemIndex = cart.items.findIndex(
//     item => item.product.toString() === productId
//   );

//   if (itemIndex === -1) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found in cart');
//   }

//   const product = await Product.findById(productId);
//   if (!product) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'Product not found');
//   }

//   if (product.quantity < quantity) {
//     throw new ApiError(
//       StatusCodes.BAD_REQUEST,
//       'Insufficient product quantity'
//     );
//   }

//   cart.items[itemIndex].quantity = quantity;
//   cart.totalAmount = cart.items.reduce(
//     (total, item) => total + item.price * item.quantity,
//     0
//   );

//   const updatedCart = await cart.save();
//   const populatedCart = await Cart.findById(updatedCart._id).populate([
//     { path: 'items.product', select: 'name images price' },
//     { path: 'items.salon', select: 'name address' },
//     { path: 'items.host', select: 'name email' },
//   ]);

//   if (!populatedCart) {
//     throw new ApiError(
//       StatusCodes.INTERNAL_SERVER_ERROR,
//       'Failed to update cart'
//     );
//   }

//   return populatedCart;
// };

// const removeCartItem = async (
//   userId: string,
//   productId: string
// ): Promise<ICart> => {
//   const cart = await Cart.findOne({ user: userId, status: 'active' });
//   if (!cart) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'Cart not found');
//   }

//   cart.items = cart.items.filter(item => item.product.toString() !== productId);

//   cart.totalAmount = cart.items.reduce(
//     (total, item) => total + item.price * item.quantity,
//     0
//   );

//   const updatedCart = await cart.save();
//   const populatedCart = await Cart.findById(updatedCart._id).populate([
//     { path: 'items.product', select: 'name images price' },
//     { path: 'items.salon', select: 'name address' },
//     { path: 'items.host', select: 'name email' },
//   ]);

//   if (!populatedCart) {
//     throw new ApiError(
//       StatusCodes.INTERNAL_SERVER_ERROR,
//       'Failed to update cart'
//     );
//   }

//   return populatedCart;
// };

// const clearCart = async (userId: string): Promise<void> => {
//   const cart = await Cart.findOne({ user: userId, status: 'active' });
//   if (!cart) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'Cart not found');
//   }

//   cart.items = [];
//   cart.totalAmount = 0;
//   await cart.save();
// };

// export const CartService = {
//   addToCart,
//   getCart,
//   updateCartItem,
//   removeCartItem,
//   clearCart,
// };
