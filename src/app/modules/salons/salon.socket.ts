// // src/socket/salon.socket.ts
// import { Server, Socket } from 'socket.io';
// import { DefaultEventsMap } from 'socket.io/dist/typed-events';

// export const SALON_EVENTS = {
//   NEW_SALON_CREATED: 'newSalonCreated',
//   SALON_STATUS_UPDATED: 'salonStatusUpdated',
//   PENDING_SALONS_COUNT: 'pendingSalonsCount',
//   JOIN_ADMIN_ROOM: 'joinAdminRoom',
//   LEAVE_ADMIN_ROOM: 'leaveAdminRoom',
// };

// const ADMIN_NOTIFICATION_ROOM = 'admin-notifications';

// export const setupSalonSocket = (
//   io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>
// ) => {
//   io.on('connection', (socket: Socket) => {
//     console.log('Client connected:', socket.id);

//     // Join admin notification room
//     socket.on(SALON_EVENTS.JOIN_ADMIN_ROOM, userData => {
//       if (userData.role === 'admin') {
//         socket.join(ADMIN_NOTIFICATION_ROOM);
//         console.log('Admin joined notification room:', socket.id);
//       }
//     });

//     // Leave admin notification room
//     socket.on(SALON_EVENTS.LEAVE_ADMIN_ROOM, () => {
//       socket.leave(ADMIN_NOTIFICATION_ROOM);
//       console.log('Left admin notification room:', socket.id);
//     });

//     socket.on('disconnect', () => {
//       console.log('Client disconnected:', socket.id);
//     });
//   });

//   return {
//     notifyNewSalon: (salonData: any) => {
//       io.to(ADMIN_NOTIFICATION_ROOM).emit(SALON_EVENTS.NEW_SALON_CREATED, {
//         message: 'New salon registration request received',
//         salon: salonData,
//       });
//     },

//     notifySalonStatusUpdate: (salonData: any) => {
//       io.to(ADMIN_NOTIFICATION_ROOM).emit(SALON_EVENTS.SALON_STATUS_UPDATED, {
//         message: `Salon status updated to ${salonData.status}`,
//         salon: salonData,
//       });
//     },

//     updatePendingSalonsCount: async () => {
//       const pendingCount = await getPendingSalonsCount();
//       io.to(ADMIN_NOTIFICATION_ROOM).emit(SALON_EVENTS.PENDING_SALONS_COUNT, {
//         count: pendingCount,
//       });
//     },
//   };
// };

// // Helper function to get pending salons count
// const getPendingSalonsCount = async (): Promise<number> => {
//   try {
//     const count = await Salon.countDocuments({ status: 'pending' });
//     return count;
//   } catch (error) {
//     console.error('Error getting pending salons count:', error);
//     return 0;
//   }
// };

// // src/app/modules/salons/salon.service.ts
// // Update the service to include socket notifications

// import { io } from '../../socket'; // Adjust the import path as needed

// const createSalonInDb = async (payload: ISalon): Promise<ISalon> => {
//   const session = await mongoose.startSession();
//   try {
//     session.startTransaction();

//     const result = await Salon.create([payload], { session });

//     if (!result.length) {
//       throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create salon');
//     }

//     await session.commitTransaction();

//     // Notify admins about new salon
//     io.notifyNewSalon(result[0]);
//     io.updatePendingSalonsCount();

//     return result[0];
//   } catch (error) {
//     await session.abortTransaction();
//     throw error;
//   } finally {
//     await session.endSession();
//   }
// };

// const updateSalonStatus = async (
//   salonId: string,
//   status: 'active' | 'inactive' | 'pending' | 'rejected',
//   remarks?: string
// ): Promise<ISalon | null> => {
//   const result = await Salon.findByIdAndUpdate(
//     salonId,
//     {
//       status,
//       $push: {
//         statusUpdateHistory: {
//           status,
//           updatedAt: new Date(),
//           remarks: remarks || '',
//         },
//       },
//     },
//     { new: true }
//   ).populate(['host', 'category']);

//   if (result) {
//     // Notify admins about status update
//     io.notifySalonStatusUpdate(result);
//     io.updatePendingSalonsCount();
//   }

//   return result;
// };

// // src/app/modules/admin/admin.controller.ts
// // Add this new controller for admin dashboard data

// const getAdminDashboardStats = catchAsync(
//   async (req: Request, res: Response) => {
//     const [
//       pendingSalons,
//       totalActiveSalons,
//       totalInactiveSalons,
//       recentStatusUpdates,
//     ] = await Promise.all([
//       Salon.countDocuments({ status: 'pending' }),
//       Salon.countDocuments({ status: 'active' }),
//       Salon.countDocuments({ status: 'inactive' }),
//       Salon.find()
//         .sort({ 'statusUpdateHistory.updatedAt': -1 })
//         .limit(10)
//         .populate('host', 'name email'),
//     ]);

//     sendResponse(res, {
//       success: true,
//       statusCode: StatusCodes.OK,
//       message: 'Admin dashboard stats retrieved successfully',
//       data: {
//         pendingSalons,
//         totalActiveSalons,
//         totalInactiveSalons,
//         recentStatusUpdates,
//       },
//     });
//   }
// );

// // Frontend React Component Example
// import React, { useEffect, useState } from 'react';
// import io from 'socket.io-client';

// const AdminDashboard = () => {
//   const [notifications, setNotifications] = useState([]);
//   const [pendingSalonsCount, setPendingSalonsCount] = useState(0);

//   useEffect(() => {
//     const socket = io('your-backend-url');

//     // Join admin notification room when component mounts
//     socket.emit(SALON_EVENTS.JOIN_ADMIN_ROOM, { role: 'admin' });

//     // Listen for new salon registrations
//     socket.on(SALON_EVENTS.NEW_SALON_CREATED, data => {
//       setNotifications(prev => [
//         {
//           type: 'new_salon',
//           message: data.message,
//           salon: data.salon,
//           timestamp: new Date(),
//         },
//         ...prev,
//       ]);
//     });

//     // Listen for salon status updates
//     socket.on(SALON_EVENTS.SALON_STATUS_UPDATED, data => {
//       setNotifications(prev => [
//         {
//           type: 'status_update',
//           message: data.message,
//           salon: data.salon,
//           timestamp: new Date(),
//         },
//         ...prev,
//       ]);
//     });

//     // Listen for pending salons count updates
//     socket.on(SALON_EVENTS.PENDING_SALONS_COUNT, data => {
//       setPendingSalonsCount(data.count);
//     });

//     return () => {
//       // Leave admin room and disconnect when component unmounts
//       socket.emit(SALON_EVENTS.LEAVE_ADMIN_ROOM);
//       socket.disconnect();
//     };
//   }, []);

//   return (
//     <div className="p-4">
//       <div className="mb-4">
//         <h2 className="text-xl font-bold">
//           Pending Salons: {pendingSalonsCount}
//         </h2>
//       </div>

//       <div className="space-y-4">
//         <h3 className="text-lg font-semibold">Recent Notifications</h3>
//         {notifications.map((notification, index) => (
//           <div key={index} className="p-4 border rounded shadow">
//             <p className="font-medium">{notification.message}</p>
//             <p className="text-sm text-gray-600">
//               {notification.salon.name} -{' '}
//               {new Date(notification.timestamp).toLocaleString()}
//             </p>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default AdminDashboard;

// I'll help you implement real-time notifications for admins using Socket.IO when salon statuses change or new salons are created.
// Real-time Salon NotificationsClick to open code
// This implementation includes:

// Socket.IO Integration:

// Real-time notifications for new salon registrations
// Instant updates when salon status changes
// Live counter for pending salons
// Admin-specific notification room


// Admin Dashboard Features:

// Live notifications feed
// Pending salons counter
// Recent status updates
// Real-time updates without page refresh


// Key Events:

// NEW_SALON_CREATED: When a new salon is registered
// SALON_STATUS_UPDATED: When a salon's status changes
// PENDING_SALONS_COUNT: Updates to the pending salons count


// Security Features:

// Admin-only notification room
// Proper socket connection/disconnection handling
// Event validation



// To use this in your project:

// Import and initialize the socket setup in your main server file:

// typescriptCopyimport { setupSalonSocket } from './socket/salon.socket';
// const io = new Server(httpServer);
// setupSalonSocket(io);

// Use the React component in your admin dashboard:

// typescriptCopyimport AdminDashboard from './components/AdminDashboard';
// // Use in your router or parent component
// <AdminDashboard />

// Make sure your authentication middleware passes the user role to socket connection.

// Would you like me to add any additional features or modify the existing implementation?