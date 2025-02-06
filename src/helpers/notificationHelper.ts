// src\helpers\notificationHelper.ts
import { INotification } from '../app/modules/notification/notification.interface';
import { Notification } from '../app/modules/notification/notification.model';

export const sendNotifications = async (data: any): Promise<INotification> => {
  const result = await Notification.create(data);

  //@ts-ignore
  const socketIo = global.io;

  if (
    data?.type === 'ADMIN' ||
    data?.type === 'HOST' ||
    data?.type === 'USER'
  ) {
    socketIo.emit(`get-notification::${data?.type}`, result);
  } else {
    socketIo.emit(`get-notification::${data?.receiver}`, result);
  }

  return result;
};


// import { INotification } from '../app/modules/notification/notification.interface';
// import { Notification } from '../app/modules/notification/notification.model';

// export type NotificationType = 'ADMIN' | 'HOST' | 'USER' | 'PAYMENT';

// interface NotificationData {
//   userId?: string;
//   message: string;
//   type: NotificationType;
//   receiver?: string;
//   metadata?: Record<string, any>;
// }

// class NotificationQueue {
//   private queue: NotificationData[] = [];
//   private processing = false;

//   async add(notification: NotificationData) {
//     this.queue.push(notification);
//     if (!this.processing) {
//       await this.process();
//     }
//   }

//   private async process() {
//     if (this.queue.length === 0) {
//       this.processing = false;
//       return;
//     }

//     this.processing = true;
//     const notification = this.queue.shift();

//     try {
//       if (notification) {
//         await sendNotification(notification);
//       }
//     } catch (error) {
//       console.error('Failed to process notification:', error);
//       // Retry failed notifications with backoff
//       if (notification) {
//         setTimeout(() => {
//           this.queue.unshift(notification);
//         }, 5000);
//       }
//     }

//     // Process next notification
//     await this.process();
//   }
// }

// const notificationQueue = new NotificationQueue();

// const validateNotificationData = (data: NotificationData): boolean => {
//   if (!data.message) {
//     console.error('Notification message is required');
//     return false;
//   }

//   if (!data.type) {
//     console.error('Notification type is required');
//     return false;
//   }

//   if (
//     data.type !== 'ADMIN' &&
//     data.type !== 'HOST' &&
//     data.type !== 'USER' &&
//     data.type !== 'PAYMENT'
//   ) {
//     console.error('Invalid notification type');
//     return false;
//   }

//   if (data.type === 'PAYMENT' && !data.metadata?.amount) {
//     console.error('Payment notifications require amount in metadata');
//     return false;
//   }

//   return true;
// };

// const sendNotification = async (
//   data: NotificationData
// ): Promise<INotification> => {
//   try {
//     if (!validateNotificationData(data)) {
//       throw new Error('Invalid notification data');
//     }

//     const result = await Notification.create({
//       userId: data.userId,
//       message: data.message,
//       type: data.type,
//       metadata: data.metadata,
//       createdAt: new Date(),
//       read: false,
//     });

//     const socketIo = global.io;
//     if (!socketIo) {
//       throw new Error('Socket.io not initialized');
//     }

//     const eventName =
//       data.type === 'ADMIN' || data.type === 'HOST' || data.type === 'USER'
//         ? `get-notification::${data.type}`
//         : `get-notification::${data.receiver}`;

//     socketIo.emit(eventName, {
//       ...result.toJSON(),
//       timestamp: new Date().toISOString(),
//     });

//     return result;
//   } catch (error) {
//     console.error('Failed to send notification:', error);
//     throw error;
//   }
// };

// export const sendNotifications = async (
//   data: NotificationData
// ): Promise<void> => {
//   await notificationQueue.add(data);
// };

// // Payment-specific notification helpers
// export const sendPaymentNotification = async (
//   userId: string,
//   amount: number,
//   status: 'success' | 'failed' | 'pending',
//   paymentId: string
// ): Promise<void> => {
//   const messages = {
//     success: `Payment of $${amount.toFixed(2)} was successful`,
//     failed: `Payment of $${amount.toFixed(2)} failed`,
//     pending: `Payment of $${amount.toFixed(2)} is pending`,
//   };

//   await sendNotifications({
//     userId,
//     message: messages[status],
//     type: 'PAYMENT',
//     metadata: {
//       amount,
//       status,
//       paymentId,
//       timestamp: new Date().toISOString(),
//     },
//   });
// };

// export const sendHostPaymentNotification = async (
//   hostId: string,
//   amount: number,
//   salonName: string
// ): Promise<void> => {
//   await sendNotifications({
//     userId: hostId,
//     message: `You received a payment of $${amount.toFixed(2)} for ${salonName}`,
//     type: 'HOST',
//     metadata: {
//       amount,
//       salonName,
//       timestamp: new Date().toISOString(),
//     },
//   });
// };