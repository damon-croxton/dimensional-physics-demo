export type DemoId = 'demo1' | 'demo2' | 'demo3' | 'demo4';

export interface DemoInfo {
  id: DemoId;
  title: string;
  subtitle: string;
  bookReference: string;
  quote: string;
  description: string;
  dimensions: string;
}

export interface SoundState {
  enabled: boolean;
  volume: number;
}

export interface Vector4D {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Face4DInfo {
  id: string;
  name: string;
  color: string;
  normal: [number, number, number];
}
