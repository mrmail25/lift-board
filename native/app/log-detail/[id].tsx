import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect, useState} from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {SessionDetail} from '../../src/data/appDb';
import {useApp} from '../../src/store/appStore';
import {Btn, Screen} from '../../src/ui/components';
import {useTheme} from '../../src/ui/theme';

export default function LogDetail() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const t = useTheme();
  const api = useApp(s => s.api);
  const [s, setS] = useState<SessionDetail | null>(null);
  useEffect(() => { if (id && api) api.getSession(id).then(setS); }, [id, api]);
  if (!s || !api) return <Screen><SafeAreaView><Text style={{padding: 24, color: t.text2}}>Loading…</Text></SafeAreaView></Screen>;
  return (
    <Screen>
      <SafeAreaView style={{flex: 1}} edges={['top']}>
        <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 40}}>
          <Text onPress={() => router.back()} style={{color: t.accentPress, fontSize: 17, marginBottom: 12}}>‹ Log</Text>
          <Text style={{color: t.ink, fontSize: 28, fontWeight: '700'}}>{s.label}</Text>
          <Text style={{color: t.text2, marginBottom: 16}}>{s.date}</Text>
          {s.entries.map(e => (
            <View key={e.id} style={{marginBottom: 14}}>
              <Text style={{color: t.ink, fontWeight: '600', fontSize: 17}}>{e.name}</Text>
              {e.sets.map(set => (
                <Text key={set.id} style={{color: t.text2, fontSize: 15, marginTop: 2}}>{set.kind === 'warmup' ? 'W ' : ''}{set.load ?? '—'} {s.unit} × {set.reps ?? '—'}</Text>
              ))}
            </View>
          ))}
          <Btn kind="grey" label="Delete workout" onPress={() => Alert.alert('Delete this workout?', 'It is removed from your Log.', [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Delete', style: 'destructive', onPress: async () => { await api.deleteSession(s.id); router.back(); }},
          ])} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
