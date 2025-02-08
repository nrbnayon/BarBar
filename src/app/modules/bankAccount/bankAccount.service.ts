import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { IBankAccount } from './bankAccount.interface';
import { BankAccount } from './bankAccount.model';
import { getLastFourDigits } from '../../../util/bankAccountUtils';

const addBankAccount = async (userId: string, payload: IBankAccount): Promise<IBankAccount> => {
  const session = await mongoose.startSession();
  let bankAccount: IBankAccount;

  try {
    session.startTransaction();

    const lastFourDigits = getLastFourDigits(payload.accountNumber);

    const existingAccount = await BankAccount.findOne({
      user: userId,
      lastFourDigits: lastFourDigits,
      bankName: payload.bankName,
    }).session(session);

    if (existingAccount) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'This bank account is already registered'
      );
    }

    const newBankAccount = await BankAccount.create(
      [
        {
          ...payload,
          user: userId,
          lastFourDigits,
          isDefault: payload.isDefault ?? false,
        },
      ],
      { session }
    );

    if (payload.isDefault) {
      await BankAccount.updateMany(
        {
          user: userId,
          _id: { $ne: newBankAccount[0]._id },
        },
        { isDefault: false },
        { session }
      );
    }

    await session.commitTransaction();
    bankAccount = newBankAccount[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  return bankAccount;
};

const getAllBankAccounts = async (userId: string): Promise<IBankAccount[]> => {
  return BankAccount.find({ user: userId }).sort({ createdAt: -1 });
};

const getBankAccountById = async (userId: string, accountId: string): Promise<IBankAccount> => {
  const bankAccount = await BankAccount.findOne({
    _id: accountId,
    user: userId,
  });

  if (!bankAccount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bank account not found');
  }

  return bankAccount;
};

const updateBankAccount = async (
  userId: string,
  accountId: string,
  payload: Partial<IBankAccount>
): Promise<IBankAccount> => {
  const bankAccount = await BankAccount.findOne({
    _id: accountId,
    user: userId,
  });

  if (!bankAccount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bank account not found');
  }

  const updatedBankAccount = await BankAccount.findByIdAndUpdate(accountId, payload, {
    new: true,
  });

  if (!updatedBankAccount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to update bank account');
  }

  return updatedBankAccount;
};

const deleteBankAccount = async (userId: string, accountId: string): Promise<void> => {
  const bankAccount = await BankAccount.findOne({
    _id: accountId,
    user: userId,
  });

  if (!bankAccount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bank account not found');
  }

  await BankAccount.findByIdAndDelete(accountId);
};

const setDefaultBankAccount = async (
  userId: string,
  accountId: string
): Promise<IBankAccount> => {
  const bankAccount = await BankAccount.findOne({
    _id: accountId,
    user: userId,
  });

  if (!bankAccount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bank account not found');
  }

  await BankAccount.updateMany(
    { user: new mongoose.Types.ObjectId(userId) },
    { isDefault: false }
  );

  const updatedBankAccount = await BankAccount.findByIdAndUpdate(
    accountId,
    { isDefault: true },
    { new: true }
  );

  if (!updatedBankAccount) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to set default bank account'
    );
  }

  return updatedBankAccount;
};

const updateBankAccountStatus = async (
  accountId: string,
  status: string,
  remarks?: string
): Promise<IBankAccount> => {
  const bankAccount = await BankAccount.findById(accountId);
  if (!bankAccount) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bank account not found');
  }

  const updatedBankAccount = await BankAccount.findByIdAndUpdate(
    accountId,
    { status, remarks },
    { new: true }
  );

  if (!updatedBankAccount) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to update bank account status'
    );
  }

  return updatedBankAccount;
};

export const BankAccountService = {
  addBankAccount,
  getAllBankAccounts,
  getBankAccountById,
  updateBankAccount,
  deleteBankAccount,
  setDefaultBankAccount,
  updateBankAccountStatus,
};