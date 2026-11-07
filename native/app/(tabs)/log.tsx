import {useRouter} from 'expo-router';
import {useEffect, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {SessionSummary} from '../../src/data/appDb';
import {useApp} from '../../src/store/appStore';
import {Group, Row, Screen, Title} from '../../src/ui/components';
import {useTheme} from '../../src/ui/theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Log() {
  const now = new Date();
  const [cursor, setCursor] = useState({y: now.getFullYear(), m: now.getMonth() + 1});
  const [rows, setRows] = useState<SessionSummary[]>([]);
  const month = useApp(s => s.month);
  const router = useRouter();
  const t = useTheme();
  useEffect(() => { month(cursor.y, cursor.m).then(setRows).catch(() => setRows([])); }, [cursor, month]);
  const shift = (d: number) => setCursor(c => {
    const dt = new Date(c.y, c.m - 1 + d, 1);
    return {y: dt.getFullYear(), m: dt.getMonth() + 1};
  });
  const byDay = new Map<number, number>();
  for (const r of rows) byDay.set(+r.date.slice(8, 10), (byDay.get(+r.date.slice(8, 10)) || 0) + 1);
  const first = new Date(cursor.y, cursor.m - 1, 1).getDay();
  const days = new Date(cursor.y, cursor.m, 0).getDate();
  const cells: (number | null)[] = [...Array((first + 6) % 7).fill(null), ...Array.from({length: days}, (_, i) => i + 1)];
  return (
    <Screen>
      <SafeAreaView style={{flex: 1}} edges={['top']}>
        <ScrollView contentContainerStyle={{paddingBottom: 32}}>
          <Title>Log</Title>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8}}>
            <Pressable accessibilityLabel="Previous month" onPress={() => shift(-1)}><Text style={{fontSize: 22, color: t.ink}}>‹</Text></Pressable>
            <Text style={{fontSize: 17, fontWeight: '600', color: t.ink}}>{MONTHS[cursor.m - 1]} {cursor.y}</Text>
            <Pressable accessibilityLabel="Next month" onPress={() => shift(1)}><Text style={{fontSize: 22, color: t.ink}}>›</Text></Pressable>
          </View>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12}}>
            {cells.map((d, i) => (
              <View key={i} style={{width: '14.28%', height: 36, alignItems: 'center', justifyContent: 'center'}}>
                {d ? <Text style={{color: byDay.has(d) ? t.accentPress : t.ink, fontWeight: byDay.has(d) ? '700' : '400'}}>{d}</Text> : null}
              </View>
            ))}
          </View>
          <Text style={{fontSize: 22, fontWeight: '700', color: t.ink, padding: 16}}>{MONTHS[cursor.m - 1]}</Text>
          {rows.length ? (
            <Group>
              {rows.map(r => (
                <Row key={r.id} label={r.label} sub={`${r.sets} sets`} onPress={() => router.push(`/log-detail/${r.id}`)} />
              ))}
            </Group>
          ) : <Text style={{color: t.text2, paddingHorizontal: 16}}>No workouts this month.</Text>}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
