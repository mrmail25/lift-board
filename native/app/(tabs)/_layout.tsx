import {Tabs} from 'expo-router';
import {useTheme} from '../../src/ui/theme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: t.accent,
      tabBarInactiveTintColor: t.tabOff,
      tabBarStyle: {backgroundColor: t.chrome, borderTopColor: t.line},
      tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
    }}>
      <Tabs.Screen name="train" options={{title: 'Train'}} />
      <Tabs.Screen name="log" options={{title: 'Log'}} />
    </Tabs>
  );
}
