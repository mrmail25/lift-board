import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect, useState} from 'react';
import {Alert, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {SessionDetail} from '../../src/data/appDb';
import {elapsedMs, formatElapsed} from '../../src/logic/clock';
import {effortChip, effortTitle, restLeft} from '../../src/logic/effort';
import {useApp} from '../../src/store/appStore';
import {Screen} from '../../src/ui/components';
import {useTheme} from '../../src/ui/theme';

export default function Workout() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const t = useTheme();
  const unit = useApp(s => s.unit);
  const effort = useApp(s => s.effort);
  const active = useApp(s => s.active);
  const reload = useApp(s => s.reload);
  const updateSet = useApp(s => s.updateSet);
  const addSet = useApp(s => s.addSet);
  const deleteSet = useApp(s => s.deleteSet);
  const nudgeRest = useApp(s => s.nudgeRest);
  const togglePause = useApp(s => s.togglePause);
  const finish = useApp(s => s.finish);
  const discard = useApp(s => s.discard);
  const [tick, setTick] = useState(0);
  const [session, setSession] = useState<SessionDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    reload(id).then(setSession);
    const h = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(h);
  }, [id, reload]);

  useEffect(() => { if (active && active.id === id) setSession(active); }, [active, id]);

  if (!session) return <Screen><SafeAreaView><Text style={{color: t.text2, padding: 24}}>Loading…</Text></SafeAreaView></Screen>;
  const now = new Date();
  void tick;
  const elapsed = formatElapsed(elapsedMs({startedAt: session.startedAt, pausedAt: session.pausedAt, pausedMs: session.pausedMs, adjMs: session.adjMs}, now));
  const left = restLeft(session.restEndsAt, now);
  return (
    <Screen>
      <SafeAreaView style={{flex: 1}} edges={['top']}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8}}>
          <Pressable accessibilityLabel="Minimize" onPress={() => router.back()}><Text style={{fontSize: 22, color: t.ink}}>⌄</Text></Pressable>
          <Pressable accessibilityLabel="Pause workout clock" onPress={() => togglePause(session.id)} style={{backgroundColor: t.fill, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6}}>
            <Text style={{color: t.ink, fontVariant: ['tabular-nums']}}>{session.pausedAt ? 'Paused ' : ''}{elapsed}</Text>
          </Pressable>
          <Pressable accessibilityLabel="Finish" onPress={async () => { await finish(session.id); router.replace(`/finish/${session.id}`); }} style={{backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8}}>
            <Text style={{color: t.onInk, fontWeight: '600'}}>Finish</Text>
          </Pressable>
        </View>
        <View style={{backgroundColor: t.surfaceInk, marginHorizontal: 12, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center'}}>
          <Text style={{color: t.onSurface, flex: 1}}>{left > 0 ? `Rest ${formatElapsed(left * 1000)}` : 'Rest · starts when you tick a set'}</Text>
          <Pressable accessibilityLabel="Minus 15 seconds" onPress={() => nudgeRest(session.id, -1)}><Text style={{color: t.onSurface, padding: 8}}>−15</Text></Pressable>
          <Pressable accessibilityLabel="Plus 15 seconds" onPress={() => nudgeRest(session.id, 1)}><Text style={{color: t.onSurface, padding: 8}}>+15</Text></Pressable>
          <Pressable accessibilityLabel="Skip rest" onPress={() => nudgeRest(session.id, 0)}><Text style={{color: t.onSurface, padding: 8}}>Skip</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 40}}>
          <Text style={{color: t.text2, fontSize: 13}}>Started {new Date(session.startedAt).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}</Text>
          <Text style={{color: t.ink, fontSize: 28, fontWeight: '700', marginBottom: 12}}>{session.label}</Text>
          {session.entries.map(ex => (
            <View key={ex.id} style={{marginBottom: 18}}>
              <Text style={{color: t.ink, fontSize: 17, fontWeight: '600', marginBottom: 6}}>{ex.name}</Text>
              <View style={{flexDirection: 'row', paddingBottom: 4}}>
                <Text style={h(t.text3)}>Set</Text><Text style={h(t.text3)}>{unit}</Text><Text style={h(t.text3)}>Reps</Text><Text style={{width: 44}} />
              </View>
              {ex.sets.map((s, i) => (
                <View key={s.id}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6}}>
                    <Text style={{width: 28, color: t.text2}}>{i + 1}</Text>
                    <TextInput accessibilityLabel={`Weight ${unit}`} keyboardType="decimal-pad" value={s.load == null ? '' : String(s.load)} onChangeText={v => updateSet(s.id, {load: v.trim() === '' ? null : Number(v)})} placeholder="—" placeholderTextColor={t.text3} style={field(t.paper, t.ink)} />
                    <TextInput accessibilityLabel="Reps" keyboardType="number-pad" value={s.reps == null ? '' : String(s.reps)} onChangeText={v => updateSet(s.id, {reps: v.trim() === '' ? null : Number(v)})} placeholder="—" placeholderTextColor={t.text3} style={field(t.paper, t.ink)} />
                    <Pressable accessibilityLabel="Done" onPress={() => updateSet(s.id, {done: !s.done})} style={{width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: s.done ? t.accent : t.fill}}>
                      <Text style={{color: s.done ? t.onInk : t.ink}}>✓</Text>
                    </Pressable>
                    <Pressable accessibilityLabel="Delete set" onPress={() => deleteSet(s.id)}><Text style={{color: t.text3, padding: 6}}>✕</Text></Pressable>
                  </View>
                  {s.done ? (
                    <View style={{flexDirection: 'row', gap: 6, marginBottom: 8, marginLeft: 28}}>
                      <Text style={{color: t.text3, alignSelf: 'center'}}>{effortTitle(effort)}</Text>
                      {[0, 1, 2, 3, 4].map(rir => (
                        <Pressable key={rir} onPress={() => updateSet(s.id, {rir: s.rir === rir ? null : rir})} style={{minWidth: 36, minHeight: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: s.rir === rir ? t.accent : t.fill}}>
                          <Text style={{color: s.rir === rir ? t.onInk : t.ink}}>{effortChip(effort, rir)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
              <Pressable onPress={() => addSet(ex.id)}><Text style={{color: t.accentPress, paddingVertical: 6}}>+ Add set</Text></Pressable>
            </View>
          ))}
          <Pressable onPress={() => router.push(`/pick/${session.id}`)} style={{backgroundColor: t.fill, borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{color: t.ink, fontWeight: '600'}}>Add exercise</Text>
          </Pressable>
          <Pressable onPress={() => Alert.alert('Discard this workout?', 'Nothing is saved to your Log.', [
            {text: 'Resume', style: 'cancel'},
            {text: 'Discard', style: 'destructive', onPress: async () => { await discard(session.id); router.back(); }},
          ])} style={{marginTop: 18, alignItems: 'center'}}>
            <Text style={{color: t.danger}}>Discard workout</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const field = (bg: string, fg: string) => ({flex: 1, backgroundColor: bg, color: fg, fontSize: 17, borderRadius: 8, paddingHorizontal: 8, minHeight: 44});
const h = (color: string) => ({flex: 1, color, fontSize: 11, fontWeight: '600' as const});
