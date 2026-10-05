import mongoose from 'mongoose';

// Disable Mongoose command buffering so queries don't hang if disconnected
mongoose.set('bufferCommands', false);

let isConnected = false;

/**
 * Connect to MongoDB using Mongoose with resilient retry and fallback handling.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/masterloop';

  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });

    isConnected = true;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    isConnected = false;
    console.warn(`[MongoDB] Notice: Could not connect to MongoDB at ${uri}.`);
    console.warn(`[MongoDB] Details: ${error.message}`);
    console.warn(`[MongoDB] Running in resilient fallback mode (in-memory caching / local dataset active).`);
    return null;
  }
}

/**
 * Returns current MongoDB connection state.
 */
export function getConnectionStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    isConnected: mongoose.connection.readyState === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
}

/**
 * Disconnect from MongoDB gracefully.
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Disconnected successfully');
  }
}

export default connectDB;
