// src\app\modules\notification\notification.model.ts
import { model, Schema } from 'mongoose';
import { INotification, NotificationModel } from './notification.interface';

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    message: {
      type: String,
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ['ADMIN', 'HOST', 'USER', 'PAYMENT'],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// Index for faster queries
notificationSchema.index({ receiver: 1, read: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

export const Notification = model<INotification, NotificationModel>(
  'Notification',
  notificationSchema
);


// import { model, Schema } from 'mongoose';
// import { INotification, NotificationModel } from './notification.interface';

// const notificationSchema = new Schema<INotification, NotificationModel>(
//   {
//     text: {
//       type: String,
//       required: true,
//     },

//     receiver: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//     },
//     read: {
//       type: Boolean,
//       default: false,
//     },
//     type: {
//       type: String,
//       required: false,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// export const Notification = model<INotification, NotificationModel>(
//   'Notification',
//   notificationSchema
// );
