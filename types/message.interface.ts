export interface TVMessage<T = Record<string, any>> {
  id: string;
  type: 'discover' | 'data' | 'command' | 'response' | 'heartbeat';
  payload: T;
  timestamp: Date;
  from: string;
  to?: string;
}
