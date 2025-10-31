import { TVDevice } from './tv-device.interface';
import { User } from './user.interface';

export enum TVCommand {
  DISCOVER = 'DISCOVER',
  HEARTBEAT = 'HEARTBEAT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ADD_QUEUE_ITEM = 'ADD_QUEUE_ITEM',
  REMOVE_QUEUE_ITEM = 'REMOVE_QUEUE_ITEM',
  CLEAR_QUEUE = 'CLEAR_QUEUE',
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  STOP = 'STOP',
  SEEK = 'SEEK',
}

interface TVBaseMessage {
  id: string;
  type: TVCommand;
  timestamp: Date;
  from: string;
  to?: string;
}

export interface TVDiscoverPayload extends TVBaseMessage {
  type: TVCommand.DISCOVER;
  payload: TVDevice & {
    isLoggedIn?: boolean;
    deviceName?: string;
  };
}

export interface TVHeartbeatPayload extends TVBaseMessage {
  type: TVCommand.HEARTBEAT;
  payload: {
    status: 'alive' | 'dead';
  };
}

export interface TVLoginPayload extends TVBaseMessage {
  type: TVCommand.LOGIN;
  payload: {
    token: string;
    user: User;
  };
}

export type TVMessage = TVDiscoverPayload | TVHeartbeatPayload | TVLoginPayload;
