import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';

import connectDB from './mongodb/connect.js';
import userRouter from './routes/user.routes.js';
import propertyRouter from './routes/property.routes.js';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
const port = process.env.PORT || 3000 ;
app.get('/', (req, res) => {
    res.status(200).json({
      message: 'Welcome to Yariga!',
    });
  });

  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/properties', propertyRouter);

const startServer = async () => {
  console.log('Starting server...');
  try {
    connectDB(process.env.MONGODB_URL);
    app.listen(process.env.PORT || 3000);
  } catch (error) {
    console.log(error);
  }
};
  startServer();

