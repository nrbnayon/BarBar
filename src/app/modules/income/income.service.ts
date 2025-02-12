// src\app\modules\income\income.service.ts
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import ApiError from '../../../errors/ApiError';
import {
  IDetailedIncomeReport,
  IIncome,
  IIncomeReport,
  TimePeriod,
} from './income.interface';
import { Income } from './income.model';

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
    .sort({ transactionDate: -1 });
};

const getSalonIncomes = async (salonId: string): Promise<IIncome[]> => {
  return Income.find({ salon: salonId })
    .populate('host')
    .populate('order')
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

const generateDetailedIncomeReport = async (
  hostId: string,
  period: TimePeriod,
  startDate?: Date,
  endDate?: Date
): Promise<IDetailedIncomeReport> => {
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
        host: new mongoose.Types.ObjectId(hostId),
        status: 'paid',
        ...dateFilter,
      },
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' },
              serviceIncome: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'service'] }, '$amount', 0],
                },
              },
              productIncome: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'product'] }, '$amount', 0],
                },
              },
              totalTransactions: { $sum: 1 },
            },
          },
        ],
        byPaymentMethod: [
          {
            $group: {
              _id: '$paymentMethod',
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ],
        dailyBreakdown: [
          {
            $group: {
              _id: {
                date: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$transactionDate',
                  },
                },
                type: '$type',
              },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { '_id.date': 1 },
          },
        ],
        recentTransactions: [
          {
            $sort: { transactionDate: -1 },
          },
          {
            $limit: 10,
          },
          {
            $lookup: {
              from: 'orders',
              localField: 'order',
              foreignField: '_id',
              as: 'orderDetails',
            },
          },
        ],
      },
    },
  ]);

  const [reportData] = result;
  const summary = reportData.summary[0] || {
    totalAmount: 0,
    serviceIncome: 0,
    productIncome: 0,
    totalTransactions: 0,
  };

  return {
    summary,
    byPaymentMethod: reportData.byPaymentMethod,
    dailyBreakdown: reportData.dailyBreakdown,
    recentTransactions: reportData.recentTransactions,
    period,
    startDate,
    endDate,
  };
};

const updateIncomeStatus = async (
  incomeId: string,
  status: string
): Promise<IIncome> => {
  const income = await Income.findById(incomeId);
  if (!income) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Income record not found');
  }

  income.status = status as any;
  await income.save();

  return income;
};

// const getAdminIncomeReport = async (
//   period: TimePeriod,
//   startDate?: Date,
//   endDate?: Date
// ): Promise<any> => {
//   let dateFilter: any = {};

//   if (startDate && endDate) {
//     dateFilter = {
//       transactionDate: {
//         $gte: startDate,
//         $lte: endDate,
//       },
//     };
//   } else {
//     const now = new Date();
//     switch (period) {
//       case 'daily':
//         startDate = new Date(now.setHours(0, 0, 0, 0));
//         endDate = new Date(now.setHours(23, 59, 59, 999));
//         break;
//       case 'weekly':
//         startDate = new Date(now.setDate(now.getDate() - now.getDay()));
//         endDate = new Date(now.setDate(now.getDate() + 6));
//         break;
//       case 'monthly':
//         startDate = new Date(now.getFullYear(), now.getMonth(), 1);
//         endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
//         break;
//       case 'yearly':
//         startDate = new Date(now.getFullYear(), 0, 1);
//         endDate = new Date(now.getFullYear(), 11, 31);
//         break;
//     }
//     dateFilter = {
//       transactionDate: {
//         $gte: startDate,
//         $lte: endDate,
//       },
//     };
//   }

//   const result = await Income.aggregate([
//     {
//       $match: {
//         status: 'paid',
//         ...dateFilter,
//       },
//     },
//     {
//       $group: {
//         _id: '$type',
//         totalAmount: { $sum: '$amount' },
//         count: { $sum: 1 },
//       },
//     },
//   ]);

//   const totalIncome = result.reduce((sum, item) => sum + item.totalAmount, 0);
//   const serviceIncome = result.find(item => item._id === 'service')?.totalAmount || 0;
//   const productIncome = result.find(item => item._id === 'product')?.totalAmount || 0;

//   return {
//     totalIncome,
//     serviceIncome,
//     productIncome,
//     period,
//     startDate,
//     endDate,
//     details: result,
//   };
// };

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
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' },
              totalCount: { $sum: 1 },
              serviceAmount: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'service'] }, '$amount', 0],
                },
              },
              productAmount: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'product'] }, '$amount', 0],
                },
              },
              serviceCount: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'service'] }, 1, 0],
                },
              },
              productCount: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'product'] }, 1, 0],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              totalAmount: 1,
              totalCount: 1,
              serviceAmount: 1,
              productAmount: 1,
              serviceCount: 1,
              productCount: 1,
              serviceRatio: {
                $multiply: [
                  { $divide: ['$serviceAmount', '$totalAmount'] },
                  100,
                ],
              },
              productRatio: {
                $multiply: [
                  { $divide: ['$productAmount', '$totalAmount'] },
                  100,
                ],
              },
              totalRatio: {
                $add: [
                  {
                    $multiply: [
                      { $divide: ['$serviceAmount', '$totalAmount'] },
                      100,
                    ],
                  },
                  {
                    $multiply: [
                      { $divide: ['$productAmount', '$totalAmount'] },
                      100,
                    ],
                  },
                ],
              },
            },
          },
        ],
        timeBreakdown: [
          {
            $group: {
              _id: {
                date: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$transactionDate',
                  },
                },
                type: '$type',
              },
              amount: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { '_id.date': 1 },
          },
        ],
        paymentMethods: [
          {
            $group: {
              _id: '$paymentMethod',
              amount: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              method: '$_id',
              amount: 1,
              count: 1,
            },
          },
        ],
      },
    },
  ]);

  const [reportData] = result;
  const summary = reportData.summary[0] || {
    totalAmount: 0,
    totalCount: 0,
    serviceAmount: 0,
    productAmount: 0,
    serviceCount: 0,
    productCount: 0,
    serviceRatio: 0,
    productRatio: 0,
    totalRatio: 0,
  };

  return {
    summary,
    timeBreakdown: reportData.timeBreakdown,
    paymentMethods: reportData.paymentMethods,
    period,
    startDate,
    endDate,
  };
};


export const IncomeService = {
  createIncome,
  getHostIncomes,
  getSalonIncomes,
  generateIncomeReport,
  updateIncomeStatus,
  getAdminIncomeReport,
  generateDetailedIncomeReport,
};
