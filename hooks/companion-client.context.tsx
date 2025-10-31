import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { createContext, PropsWithChildren, use, useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import Zeroconf, { Service } from 'react-native-zeroconf';

import { TVCommand, TVMessage } from '@/types/message.interface';
import { TVDevice } from '@/types/tv-device.interface';
import { useSession } from './authentication/auth.context';

const clientId = Crypto.randomUUID();
const deviceInfo = {
  id: clientId,
  name: Device.deviceName ?? `Companion ${clientId}`,
  platform: Platform.OS,
};

export interface ConnectedDevice {
  device: TVDevice;
  socket: TcpSocket.Socket;
  isConnected: boolean;
  lastHeartbeat: Date;
}

export interface CompanionClientState {
  discoveredTVs: TVDevice[];
  connectedDevices: ConnectedDevice[];
  receivedMessages: TVMessage[];
  connectToTV: (tv: TVDevice) => void;
  connectManually: (host: string, port: number, name?: string) => void;
  disconnect: (deviceId: string) => void;
  disconnectAll: () => void;
  sendMessage: (message: Partial<TVMessage>, deviceId?: string) => void;
  sendCommand: (command: string, params?: Record<string, unknown>, deviceId?: string) => void;
  sendLogin: (deviceId?: string) => void;
}

const CompanionClientContext = createContext<CompanionClientState>({
  discoveredTVs: [],
  connectedDevices: [],
  receivedMessages: [],
  connectToTV: () => null,
  connectManually: () => null,
  disconnect: () => null,
  disconnectAll: () => null,
  sendMessage: () => null,
  sendCommand: () => null,
  sendLogin: () => null,
});

export function useCompanionClient() {
  const value = use(CompanionClientContext);
  if (!value) {
    throw new Error('useCompanionClient must be wrapped in a <CompanionClientProvider />');
  }

  return value;
}

export function CompanionClientProvider({ children }: PropsWithChildren) {
  const { token, user } = useSession();
  const [discoveredTVs, setDiscoveredTVs] = useState<Map<string, TVDevice>>(new Map());
  const [connectedDevices, setConnectedDevices] = useState<Map<string, ConnectedDevice>>(new Map());
  const [receivedMessages, setReceivedMessages] = useState<TVMessage[]>([]);
  const zeroconfRef = useRef<Zeroconf | null>(null);
  const heartbeatIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastConnectionAttemptRef = useRef<number>(0);

  // Connect to a TV
  const connectToTV = useCallback(
    (tv: TVDevice) => {
      // Check if already connected to this device
      if (connectedDevices.has(tv.id)) {
        console.info(`[TCP] Already connected to ${tv.name}`);
        return;
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

          // Add to connected devices
          setConnectedDevices(prev => {
            const newMap = new Map(prev);
            newMap.set(tv.id, {
              device: tv,
              socket: client,
              isConnected: true,
              lastHeartbeat: new Date(),
            });
            return newMap;
          });

          // Start heartbeat for this device
          const heartbeatInterval = setInterval(() => {
            const fullMessage: TVMessage = {
              id: Crypto.randomUUID(),
              type: TVCommand.HEARTBEAT,
              payload: { status: 'alive' },
              timestamp: new Date(),
              from: deviceInfo.id,
              to: tv.id,
            } as TVMessage;
            client.write(JSON.stringify(fullMessage));

            // Update last heartbeat
            setConnectedDevices(prev => {
              const newMap = new Map(prev);
              const device = newMap.get(tv.id);
              if (device) {
                newMap.set(tv.id, { ...device, lastHeartbeat: new Date() });
              }
              return newMap;
            });
          }, 30000); // Every 30 seconds

          heartbeatIntervalsRef.current.set(tv.id, heartbeatInterval);
        },
      );

      client.on('data', data => {
        try {
          console.info('[TCP] Raw data received:', data.toString());
          const message: TVMessage = JSON.parse(data.toString());
          console.info('[TCP] Parsed message:', message);
          setReceivedMessages(prev => [...prev, message]);

          // Handle discover message to update TV device info
          if (message.type === TVCommand.DISCOVER && message.payload) {
            const discoverPayload = message.payload as TVDevice;
            const { name: deviceName, isLoggedIn } = discoverPayload;

            // Update connected device info
            setConnectedDevices(prev => {
              const newMap = new Map(prev);
              const device = newMap.get(tv.id);
              if (device) {
                newMap.set(tv.id, {
                  ...device,
                  device: {
                    ...device.device,
                    deviceName: deviceName || device.device.name,
                    isLoggedIn,
                  },
                });
              }
              return newMap;
            });

            // Also update in discovered TVs map
            setDiscoveredTVs(prev => {
              const newMap = new Map(prev);
              const existingTV = newMap.get(tv.id);
              if (existingTV) {
                newMap.set(tv.id, {
                  ...existingTV,
                  deviceName: deviceName || existingTV.name,
                  isLoggedIn,
                });
              }
              return newMap;
            });
          }
        } catch (error) {
          console.error('[TCP] Error parsing message:', error, 'Raw data:', data.toString());
        }
      });

      client.on('error', error => {
        console.error('[TCP] Connection error:', error);
        setConnectedDevices(prev => {
          const newMap = new Map(prev);
          const device = newMap.get(tv.id);
          if (device) {
            newMap.set(tv.id, { ...device, isConnected: false });
          }
          return newMap;
        });
      });

      client.on('close', () => {
        console.info('[TCP] Connection closed by remote or local');

        // Remove from connected devices
        setConnectedDevices(prev => {
          const newMap = new Map(prev);
          newMap.delete(tv.id);
          return newMap;
        });

        // Clear heartbeat interval
        const interval = heartbeatIntervalsRef.current.get(tv.id);
        if (interval) {
          clearInterval(interval);
          heartbeatIntervalsRef.current.delete(tv.id);
        }
      });

      client.on('end', () => {
        console.info('[TCP] Connection ended');
      });
    },
    [connectedDevices],
  );

  // Auto-connect to TV at configured domain
  const autoConnect = useCallback(
    (host: string, port: number, retryInterval: number = 30000) => {
      const deviceId = `auto-${host}-${port}`;
      if (connectedDevices.has(deviceId)) {
        return;
      }

      console.info(`[AutoConnect] Attempting to connect to TV at ${host}:${port}`);
      const now = Date.now();
      if (now - lastConnectionAttemptRef.current < retryInterval) {
        return;
      }

      lastConnectionAttemptRef.current = now;
      const manualTV: TVDevice = {
        id: deviceId,
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
    [connectedDevices, connectToTV],
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

  // Disconnect from a specific TV
  const disconnect = useCallback(
    (deviceId: string) => {
      console.info(`[TCP] Disconnect called for device: ${deviceId}`);

      const device = connectedDevices.get(deviceId);
      if (!device) {
        // console.warn(`[TCP] Device ${deviceId} not found in connected devices`);
        return;
      }

      // Clear heartbeat interval
      const interval = heartbeatIntervalsRef.current.get(deviceId);
      if (interval) {
        clearInterval(interval);
        heartbeatIntervalsRef.current.delete(deviceId);
      }

      // Destroy socket
      console.info('[TCP] Destroying socket');
      device.socket.destroy();

      // Remove from connected devices
      setConnectedDevices(prev => {
        const newMap = new Map(prev);
        newMap.delete(deviceId);
        return newMap;
      });
    },
    [connectedDevices],
  );

  // Disconnect from all TVs
  const disconnectAll = useCallback(() => {
    console.info('[TCP] Disconnect all called');

    // Clear all heartbeat intervals
    heartbeatIntervalsRef.current.forEach(interval => clearInterval(interval));
    heartbeatIntervalsRef.current.clear();

    // Destroy all sockets
    connectedDevices.forEach(device => {
      device.socket.destroy();
    });

    // Clear connected devices
    setConnectedDevices(new Map());
  }, [connectedDevices]);

  // Send message to TV (or all TVs if deviceId not specified)
  const sendMessage = useCallback(
    (message: Partial<TVMessage>, deviceId?: string) => {
      if (connectedDevices.size === 0) {
        // Silently return if not connected
        return;
      }

      const devicesToSendTo = deviceId
        ? ([connectedDevices.get(deviceId)].filter(Boolean) as ConnectedDevice[])
        : Array.from(connectedDevices.values());

      devicesToSendTo.forEach(device => {
        if (!device.isConnected) return;

        const fullMessage: TVMessage = {
          id: Crypto.randomUUID(),
          type: message.type || TVCommand.HEARTBEAT,
          payload: message.payload || {},
          timestamp: new Date(),
          from: deviceInfo.id,
          to: device.device.id,
        } as TVMessage;

        device.socket.write(JSON.stringify(fullMessage));
      });
    },
    [connectedDevices],
  );

  // Send command to TV (or all TVs if deviceId not specified)
  const sendCommand = useCallback(
    (command: string, params?: Record<string, unknown>, deviceId?: string) => {
      sendMessage(
        {
          type: TVCommand.HEARTBEAT, // You may need to add a COMMAND type to TVCommand enum
          payload: {
            command,
            params: params || {},
          },
        },
        deviceId,
      );
    },
    [sendMessage],
  );

  // Send login credentials to TV (or all TVs if deviceId not specified)
  const sendLogin = useCallback(
    (deviceId?: string) => {
      if (!token || !user) {
        // console.warn('[Companion] Cannot send login - missing token or user');
        return;
      }

      console.info('[Companion] Sending login to TV');
      sendMessage(
        {
          type: TVCommand.LOGIN,
          payload: {
            token,
            user,
          },
        },
        deviceId,
      );
    },
    [token, user, sendMessage],
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
      disconnectAll();
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

  return (
    <CompanionClientContext
      value={{
        discoveredTVs: Array.from(discoveredTVs.values()),
        connectedDevices: Array.from(connectedDevices.values()),
        receivedMessages,
        connectToTV,
        connectManually,
        disconnect,
        disconnectAll,
        sendMessage,
        sendCommand,
        sendLogin,
      }}
    >
      {children}
    </CompanionClientContext>
  );
}
