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
  const totalAmount = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return { totalItems, totalQuantity, totalAmount };
};

const addToCart = async (
  userId: string,
  productId: string,
  quantity: number
): Promise<ICart> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const product = await Product.findOne({ _id: productId, status: 'active' });
    if (!product) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Product not found or inactive'
      );
    }

    if (product.quantity < quantity) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Insufficient product quantity'
      );
    }

    let cart = await Cart.findOne({ user: userId, status: 'active' });

    if (!cart) {
      const newCart = await Cart.create(
        [
          {
            user: userId,
            totalAmount: product.price * quantity,
            items: [
              {
                product: product._id,
                quantity,
                price: product.price,
                salon: product.salon,
                host: product.host,
              },
            ],
          },
        ],
        { session }
      );

      if (!newCart || newCart.length === 0) {
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Failed to create cart'
        );
      }

      cart = newCart[0];
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

      cart.items.push({
        product: product._id,
        quantity,
        price: product.price,
        salon: product.salon,
        host: product.host,
      });

      const { totalAmount } = calculateCartSummary(cart);
      cart.totalAmount = totalAmount;

      await cart.save({ session });
    }

    await session.commitTransaction();

    const populatedCart = await Cart.findById(cart._id).populate([
      { path: 'items.product', select: 'name images price' },
      { path: 'items.salon', select: 'name address' },
      { path: 'items.host', select: 'name email' },
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
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
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
  addToCart,
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
