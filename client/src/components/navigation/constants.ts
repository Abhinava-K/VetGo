import { Dimensions } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const TAB_BAR_HEIGHT = 58;
export const BUBBLE_SIZE = 48;
export const DIP_WIDTH = 76;
export const DIP_HEIGHT = 22;

export interface TabConfig {
  name: string;
  label: string;
  icon: string;
  activeIcon: string;
}

export const DEFAULT_TABS: TabConfig[] = [
  { name: 'Map', label: 'Map', icon: 'map-outline', activeIcon: 'map' },
  { name: 'Requests', label: 'Requests', icon: 'document-text-outline', activeIcon: 'document-text' },
  { name: 'Pets', label: 'Pets', icon: 'paw-outline', activeIcon: 'paw' },
  { name: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  { name: 'DoctorHome', label: 'Alerts', icon: 'alert-circle-outline', activeIcon: 'alert-circle' },
  { name: 'DoctorHistory', label: 'History', icon: 'time-outline', activeIcon: 'time' },
];

export const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.8,
};
