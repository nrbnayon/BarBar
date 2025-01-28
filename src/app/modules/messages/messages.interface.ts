// src\app\modules\messages\messages.interface.ts
import { Types } from 'mongoose';

export type IMessage = {
  sender: Types.ObjectId;
  content: string;
  chat: Types.ObjectId;
  readBy: Types.ObjectId[];
  replyTo?: Types.ObjectId;
  isPinned: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  editHistory?: {
    content: string;
    editedAt: Date;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type IMessageFilters = {
  searchTerm?: string;
  chatId?: string;
  isPinned?: boolean;
  isDeleted?: boolean;
  sender?: string;
  startDate?: Date;
  endDate?: Date;
};