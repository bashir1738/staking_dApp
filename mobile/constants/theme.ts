import { Platform } from 'react-native';

export const Colors = {
  bg: '#000000',
  surface: '#0a0a0a',
  surface2: '#111111',
  surface3: '#181818',
  border: '#1a1a1a',
  border2: '#242424',
  border3: '#2e2e2e',
  text: '#e8e8e8',
  text2: '#909090',
  text3: '#525252',
  green: '#4ade80',
  red: '#f87171',
  amber: '#fbbf24',
};

export const Fonts = Platform.select({
  ios: { sans: 'System', mono: 'Menlo' },
  default: { sans: 'normal', mono: 'monospace' },
});
