export interface Theme {
  mode: 'light' | 'dark';
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  error: string;
  border: string;
  card: string;
  shadow: string;
  success: string;
  warning: string;
}

export const lightTheme: Theme = {
  mode: 'light',
  primary: '#2E7D32',
  secondary: '#1565C0',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  error: '#C62828',
  border: '#E0E0E0',
  card: '#FFFFFF',
  shadow: '#000000',
  success: '#43A047',
  warning: '#FB8C00'
};

export const darkTheme: Theme = {
  mode: 'dark',
  primary: '#66BB6A',
  secondary: '#42A5F5',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#F5F5F5',
  textSecondary: '#BDBDBD',
  error: '#EF5350',
  border: '#333333',
  card: '#1E1E1E',
  shadow: '#000000',
  success: '#81C784',
  warning: '#FFB74D'
};
