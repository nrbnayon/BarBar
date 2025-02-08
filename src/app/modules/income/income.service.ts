import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { IIncome, IIncomeReport, TimePeriod } from './income.interface';
import { Income } from './income.model';
import { BankAccount } from '../bankAccount/bankAccount.model';

const createIncome = async (payload: IIncome): Promise<IIncome> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const income = await Income.create([payload], { session });

    await session.commitTransaction();
    return income[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getHostIncomes = async (hostId: string): Promise<IIncome[]> => {
  return Income.find({ host: hostId })
    .populate('salon')
    .populate('order')
    .populate('bankAccount')
    .sort({ transactionDate: -1 });
};

const getSalonIncomes = async (salonId: string): Promise<IIncome[]> => {
  return Income.find({ salon: salonId })
    .populate('host')
    .populate('order')
    .populate('bankAccount')
    .sort({ transactionDate: -1 });
};

const generateIncomeReport = async (
  hostId: string,
  period: TimePeriod,
  startDate?: Date,
  endDate?: Date
): Promise<IIncomeReport> => {
  return Income.generateReport(hostId, period, startDate, endDate);
};

const updateIncomeStatus = async (
  incomeId: string,
  status: string,
  bankAccountId?: string
): Promise<IIncome> => {
  const income = await Income.findById(incomeId);
  if (!income) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Income record not found');
  }

  if (bankAccountId) {
    const bankAccount = await BankAccount.findOne({
      _id: bankAccountId,
      user: income.host,
      status: 'active',
    });

    if (!bankAccount) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Active bank account not found'
      );
    }

    income.bankAccount = bankAccount._id;
  }

  income.status = status as any;
  await income.save();

  return income;
};

const getAdminIncomeReport = async (
  period: TimePeriod,
  startDate?: Date,
  endDate?: Date
): Promise<any> => {
  let dateFilter: any = {};

  if (startDate && endDate) {
    dateFilter = {
      transactionDate: {
        $gte: startDate,
        $lte: endDate,
      },
    };
  } else {
    const now = new Date();
    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(now.setDate(now.getDate() + 6));
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
    }
    dateFilter = {
      transactionDate: {
        $gte: startDate,
        $lte: endDate,
      },
    };
  }

  const result = await Income.aggregate([
    {
      $match: {
        status: 'paid',
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const totalIncome = result.reduce((sum, item) => sum + item.totalAmount, 0);
  const serviceIncome = result.find(item => item._id === 'service')?.totalAmount || 0;
  const productIncome = result.find(item => item._id === 'product')?.totalAmount || 0;

  return {
    totalIncome,
    serviceIncome,
    productIncome,
    period,
    startDate,
    endDate,
    details: result,
  };
};

export const IncomeService = {
  createIncome,
  getHostIncomes,
  getSalonIncomes,
  generateIncomeReport,
  updateIncomeStatus,
  getAdminIncomeReport,
};