import dotenv from 'dotenv';
import app from './app';
import { createRealtimeServer } from './socketServer';

dotenv.config();

const PORT = process.env.PORT || 5000;

const { httpServer, io } = createRealtimeServer(app);

// Make io available to other modules
export { io };

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
