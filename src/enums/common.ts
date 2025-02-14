// src/enums/common.ts
export type PaymentMethod = 'cash' | 'card' | 'visa' | 'mastercard' | 'paypal';
export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'paid';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'delivered';
