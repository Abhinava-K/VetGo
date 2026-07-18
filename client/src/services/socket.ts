import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

let socket: Socket | null = null;

const getBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:4000`;
  }
  return 'http://localhost:4000'; // fallback
};

export const initSocket = async (): Promise<Socket | null> => {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) return null;

  if (socket) {
    socket.disconnect();
  }

  socket = io(getBaseUrl(), {
    auth: {
      token
    }
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
