export interface TVDevice {
  id: string;
  name: string;
  platform: 'androidtv' | 'tvos';
  host: string;
  port: number;
  addresses: string[];
  lastSeen: Date;
  txt?: Record<string, unknown>;
}
