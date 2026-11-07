import {useColorScheme} from 'react-native';
import {dark, light, type Theme} from './tokens';
import {useApp} from '../store/appStore';

export function useTheme(): Theme {
  const choice = useApp(s => s.theme);
  const system = useColorScheme();
  const darkOn = choice === 'dark' || (choice === 'system' && system === 'dark');
  return darkOn ? dark : light;
}
