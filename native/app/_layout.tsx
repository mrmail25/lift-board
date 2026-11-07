import {Stack} from 'expo-router';
import {useEffect} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {openApp} from '../src/data/appDb';
import {openExpoDatabase} from '../src/data/expoDriver';
import {useApp} from '../src/store/appStore';
import {useTheme} from '../src/ui/theme';

export default function Root() {
  const boot = useApp(s => s.boot);
  const ready = useApp(s => s.ready);
  const error = useApp(s => s.error);
  const t = useTheme();
  useEffect(() => {
    let gone = false;
    openExpoDatabase()
      .then(driver => openApp(driver))
      .then(api => { if (!gone) return boot(api); })
      .catch(e => { if (!gone) useApp.setState({error: e instanceof Error ? e.message : 'Could not open the database.', ready: true}); });
    return () => { gone = true; };
  }, [boot]);
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        {ready ? (
          <Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: t.bg}}}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="workout/[id]" />
            <Stack.Screen name="pick/[id]" />
            <Stack.Screen name="finish/[id]" />
            <Stack.Screen name="log-detail/[id]" />
          </Stack>
        ) : (
          <View style={{flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24}}>
            <ActivityIndicator color={t.accent} />
            {error ? <Text style={{color: t.ink, marginTop: 16, textAlign: 'center'}}>{error}</Text> : null}
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
