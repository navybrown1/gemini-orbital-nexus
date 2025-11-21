export interface Planet {
  id: string;
  name: string;
  color: string;
  radius: number;
  distance: number;
  speed: number;
  description: string;
  type: 'Terrestrial' | 'Gas Giant' | 'Ice Giant' | 'Dwarf';
  atmosphere: string;
  angle: number; // Internal for animation
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface LiveConfig {
  voiceName: string;
}

export interface ScanResult {
  imageUrl: string | null;
  loading: boolean;
}