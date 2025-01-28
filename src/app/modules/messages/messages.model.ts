// src\app\modules\messages\messages.model.ts

import { Schema, model } from 'mongoose';
import { IMessage } from './messages.interface';

const messageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    editHistory: [{
      content: {
        type: String,
        required: true,
      },
      editedAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// Index for text search
messageSchema.index({ content: 'text' });

export const Message = model<IMessage>('Message', messageSchema);