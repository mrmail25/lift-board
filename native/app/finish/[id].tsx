import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {SessionDetail} from '../../src/data/appDb';
import {elapsedMs, formatElapsed} from '../../src/logic/clock';
import {useApp} from '../../src/store/appStore';
import {Btn, Screen} from '../../src/ui/components';
import {useTheme} from '../../src/ui/theme';

export default function Finish() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const t = useTheme();
  const api = useApp(s => s.api);
  const [s, setS] = useState<SessionDetail | null>(null);
  useEffect(() => { if (id && api) api.getSession(id).then(setS); }, [id, api]);
  if (!s) return <Screen><SafeAreaView><Text style={{padding: 24, color: t.text2}}>Loading…</Text></SafeAreaView></Screen>;
  const sets = s.entries.reduce((n, e) => n + e.sets.filter(x => x.done && (x.reps || 0) > 0).length, 0);
  const vol = s.entries.reduce((n, e) => n + e.sets.filter(x => x.done).reduce((a, x) => a + (x.load || 0) * (x.reps || 0), 0), 0);
  const ms = elapsedMs({startedAt: s.startedAt, endedAt: s.endedAt, pausedMs: s.pausedMs, adjMs: s.adjMs}, new Date());
  return (
    <Screen>
      <SafeAreaView style={{flex: 1, padding: 20}} edges={['top', 'bottom']}>
        <Text style={{color: t.text2, fontSize: 13}}>Workout complete</Text>
        <Text style={{color: t.ink, fontSize: 28, fontWeight: '700', marginTop: 6}}>{s.label}</Text>
        <Text style={{color: t.text2, marginTop: 4}}>{new Date(s.startedAt).toLocaleString()}</Text>
        <View style={{flexDirection: 'row', gap: 16, marginVertical: 24}}>
          <Stat n={formatElapsed(ms)} l="time" />
          <Stat n={String(sets)} l="sets" />
          <Stat n={Math.round(vol).toLocaleString('en-US')} l={`${s.unit} volume`} />
        </View>
        <Text style={{color: t.text2, fontSize: 13, marginBottom: 24}}>Volume is the sum of the load and reps you logged.</Text>
        <Btn label="Done" onPress={() => router.replace('/log')} />
      </SafeAreaView>
    </Screen>
  );
  function Stat({n, l}: {n: string; l: string}) {
    return <View><Text style={{color: t.ink, fontSize: 22, fontWeight: '700'}}>{n}</Text><Text style={{color: t.text2}}>{l}</Text></View>;
  }
}
