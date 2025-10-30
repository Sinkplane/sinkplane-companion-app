import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import Zeroconf, { Service } from 'react-native-zeroconf';

import { TVMessage } from '@/types/message.interface';
import { TVDevice } from '@/types/tv-device.interface';

const clientId = Crypto.randomUUID();
const deviceInfo = {
  id: clientId,
  name: Device.deviceName ?? `Companion ${clientId}`,
  platform: Platform.OS,
};

export function useCompanionClient() {
  const [discoveredTVs, setDiscoveredTVs] = useState<Map<string, TVDevice>>(new Map());
  const [connectedTV, setConnectedTV] = useState<TVDevice | null>(null);
  const [socket, setSocket] = useState<TcpSocket.Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [receivedMessages, setReceivedMessages] = useState<TVMessage[]>([]);
  const zeroconfRef = useRef<Zeroconf | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastConnectionAttemptRef = useRef<number>(0);

  // Connect to a TV
  const connectToTV = useCallback(
    (tv: TVDevice) => {
      if (socket) {
        socket.destroy();
      }

      console.info(`[TCP] Attempting to connect to ${tv.host}:${tv.port}`);

      const client = TcpSocket.createConnection(
        {
          port: tv.port,
          host: tv.host,
        },
        () => {
          console.info(`[TCP] Successfully connected to TV: ${tv.name}`);
          console.info('[TCP] Setting socket state and heartbeat...');
          setIsConnected(true);
          setConnectedTV(tv);

          // Start heartbeat
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          heartbeatIntervalRef.current = setInterval(() => {
            sendMessage({
              type: 'heartbeat',
              payload: { status: 'alive' },
            });
          }, 30000); // Every 30 seconds
        },
      );

      client.on('data', data => {
        try {
          console.info('[TCP] Raw data received:', data.toString());
          const message: TVMessage = JSON.parse(data.toString());
          console.info('[TCP] Parsed message:', message);
          setReceivedMessages(prev => [...prev, message]);
        } catch (error) {
          console.error('[TCP] Error parsing message:', error, 'Raw data:', data.toString());
        }
      });

      client.on('error', error => {
        console.error('[TCP] Connection error:', error);
        setIsConnected(false);
        // Clean up the failed socket
        if (socket === client) {
          setSocket(null);
        }
      });

      client.on('close', () => {
        console.info('[TCP] Connection closed by remote or local');
        setIsConnected(false);
        setConnectedTV(null);
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      });

      client.on('end', () => {
        console.info('[TCP] Connection ended');
      });

      setSocket(client);
    },
    [socket],
  );

  // Auto-connect to TV at configured domain
  const autoConnect = useCallback(
    (host: string, port: number, retryInterval: number = 30000) => {
      if (isConnected) {
        return;
      }

      console.info(`[AutoConnect] Attempting to connect to TV at ${host}:${port}`);
      const now = Date.now();
      if (now - lastConnectionAttemptRef.current < retryInterval) {
        return;
      }

      lastConnectionAttemptRef.current = now;
      const manualTV: TVDevice = {
        id: `auto-${host}-${port}`,
        name: 'Apple TV',
        platform: 'tvos',
        host,
        port,
        addresses: [host],
        lastSeen: new Date(),
        txt: {},
      };

      connectToTV(manualTV);
    },
    [isConnected, connectToTV],
  );

  // Start discovering TV services
  const startDiscovery = useCallback(() => {
    try {
      const zeroconf = new Zeroconf();
      zeroconfRef.current = zeroconf;

      if (!zeroconf) {
        console.error('Failed to initialize Zeroconf');
        return;
      }

      zeroconf.on('start', () => {
        console.info('[Zeroconf] Starting TV discovery...');
      });

      zeroconf.on('resolved', (service: Service) => {
        console.info('[Zeroconf] Discovered TV:', JSON.stringify(service, null, 2));

        const tvDevice: TVDevice = {
          id: service.txt?.id || service.name,
          name: service.name,
          platform: service.txt?.platform || 'tvos',
          host: service.addresses?.[0] || service.host,
          port: service.port || 9999,
          addresses: service.addresses || [],
          lastSeen: new Date(),
          txt: service.txt || {},
        };

        setDiscoveredTVs(prev => new Map(prev).set(tvDevice.id, tvDevice));
      });

      zeroconf.on('remove', (name: string) => {
        console.info('[Zeroconf] TV service removed:', name);
        setDiscoveredTVs(prev => {
          const newMap = new Map(prev);
          // Try to find and remove by name since we only get the name
          for (const [key, tv] of newMap.entries()) {
            if (tv.name === name) {
              newMap.delete(key);
              break;
            }
          }
          return newMap;
        });
      });

      zeroconf.on('error', (error: Error | unknown) => {
        console.error('[Zeroconf] Error:', error);
      });

      console.info('[Zeroconf] Scanning for react-native-tv._tcp.local.');
      zeroconf.scan('react-native-tv', 'tcp', 'local.');

      // Also log found services
      zeroconf.on('found', (name: string) => {
        console.info('[Zeroconf] Found service (not yet resolved):', name);
      });
    } catch (error) {
      console.error('Failed to start discovery:', error);
      zeroconfRef.current = null;
    }
  }, []);

  // Stop discovery
  const stopDiscovery = useCallback(() => {
    if (zeroconfRef.current) {
      zeroconfRef.current.stop();
      zeroconfRef.current = null;
    }
  }, []);

  // Disconnect from TV
  const disconnect = useCallback(() => {
    console.info('[TCP] Disconnect called');
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (socket) {
      console.info('[TCP] Destroying socket');
      socket.destroy();
      setSocket(null);
    }
    setIsConnected(false);
    setConnectedTV(null);
  }, [socket]);

  // Send message to TV
  const sendMessage = useCallback(
    (message: Partial<TVMessage>) => {
      if (!socket || !isConnected) {
        // Silently return if not connected
        return;
      }

      const fullMessage: TVMessage = {
        id: Crypto.randomUUID(),
        type: message.type || 'data',
        payload: message.payload || {},
        timestamp: new Date(),
        from: deviceInfo.id,
        to: connectedTV?.id,
      };

      socket.write(JSON.stringify(fullMessage));
    },
    [socket, isConnected, connectedTV],
  );

  // Send command to TV
  const sendCommand = useCallback(
    (command: string, params?: Record<string, unknown>) => {
      sendMessage({
        type: 'command',
        payload: {
          command,
          params: params || {},
        },
      });
    },
    [sendMessage],
  );

  // Start discovery or auto-connect on mount
  useEffect(() => {
    const connectionMode = process.env.EXPO_PUBLIC_CONNECTION_MODE || 'discovery';
    const tvDomain = process.env.EXPO_PUBLIC_TV_DOMAIN || '192.168.1.148';
    const tvPort = Number(process.env.EXPO_PUBLIC_TV_PORT || 9999);
    const retryInterval = Number(process.env.EXPO_PUBLIC_RETRY_INTERVAL || 30000);

    if (connectionMode === 'autoconnect') {
      // Auto-connect mode: try to connect immediately and retry at interval
      autoConnect(tvDomain, tvPort, retryInterval);

      retryIntervalRef.current = setInterval(() => {
        autoConnect(tvDomain, tvPort, retryInterval);
      }, retryInterval);
    } else {
      // Discovery mode: scan for TVs
      startDiscovery();
    }

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
      stopDiscovery();
      disconnect();
    };
  }, []);

  // Manual connect function for development (use localhost for simulator)
  const connectManually = useCallback(
    (host: string, port: number, name: string = 'Manual TV') => {
      const manualTV: TVDevice = {
        id: `manual-${host}-${port}`,
        name,
        platform: 'tvos',
        host,
        port,
        addresses: [host],
        lastSeen: new Date(),
        txt: {},
      };
      connectToTV(manualTV);
    },
    [connectToTV],
  );

  return {
    discoveredTVs: Array.from(discoveredTVs.values()),
    connectedTV,
    isConnected,
    receivedMessages,
    connectToTV,
    connectManually,
    disconnect,
    sendMessage,
    sendCommand,
  };
}
