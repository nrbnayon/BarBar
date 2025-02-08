import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { BankAccountService } from './bankAccount.service';
import getFilePath from '../../../shared/getFilePath';

const addBankAccount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  let bankAccountData = { ...req.body };

  if (req.files) {
    const docPath = getFilePath(req.files, 'verificationDocument');
    if (docPath) {
      bankAccountData.verificationDocument = docPath;
    }
  }

  const result = await BankAccountService.addBankAccount(userId, bankAccountData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Bank account added successfully',
    data: result,
  });
});

const getAllBankAccounts = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await BankAccountService.getAllBankAccounts(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Bank accounts retrieved successfully',
    data: result,
  });
});

const getBankAccountById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { accountId } = req.params;
  const result = await BankAccountService.getBankAccountById(userId, accountId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Bank account retrieved successfully',
    data: result,
  });
});

const updateBankAccount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { accountId } = req.params;
  let updateData = { ...req.body };

  if (req.files) {
    const docPath = getFilePath(req.files, 'verificationDocument');
    if (docPath) {
      updateData.verificationDocument = docPath;
    }
  }

  const result = await BankAccountService.updateBankAccount(userId, accountId, updateData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Bank account updated successfully',
    data: result,
  });
});

const deleteBankAccount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { accountId } = req.params;
  await BankAccountService.deleteBankAccount(userId, accountId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Bank account deleted successfully',
  });
});

const setDefaultBankAccount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { accountId } = req.params;
  const result = await BankAccountService.setDefaultBankAccount(userId, accountId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Default bank account set successfully',
    data: result,
  });
});

const updateBankAccountStatus = catchAsync(async (req: Request, res: Response) => {
  const { accountId } = req.params;
  const { status, remarks } = req.body;
  const result = await BankAccountService.updateBankAccountStatus(accountId, status, remarks);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Bank account status updated successfully',
    data: result,
  });
});

export const BankAccountController = {
  addBankAccount,
  getAllBankAccounts,
  getBankAccountById,
  updateBankAccount,
  deleteBankAccount,
  setDefaultBankAccount,
  updateBankAccountStatus,
};