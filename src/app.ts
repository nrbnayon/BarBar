import express, { Request, Response } from 'express';
import cors from 'cors';
import { StatusCodes } from 'http-status-codes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './routes';
import { Morgan } from './shared/morgen';
import { PaymentController } from './app/modules/paytoadmin/payment.controller';

const app = express();

// Morgan Logging
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

// CORS Setup
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://192.168.10.19:3000',
      'http://192.168.10.18:3030',
      'http://192.168.10.19:3030',
      'http://10.0.70.173:5173',
      'http://10.0.70.172:5173',
      'http://10.0.70.173:50262',
      'http://localhost:4000',
    ],
    credentials: true,
  })
);

// ⚠️ Webhook MUST use express.raw()
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.handleWebhook
);

// ✅ JSON Middleware (ONLY AFTER Webhook Route)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static('uploads'));

// API Routes
app.use('/api/v1', router);

// Home Route
app.get('/', (req: Request, res: Response) => {
  res.send(
    '<h1 style="text-align:center; color:#A55FEF; font-family:Verdana;">Hey Frontend Developer, How can I assist you today!</h1>'
  );
});

// Global Error Handling
app.use(globalErrorHandler);

// Handle 404 Routes
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: '❌ API Not Found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: "🚫 API DOESN'T EXIST",
      },
    ],
  });
});

export default app;
