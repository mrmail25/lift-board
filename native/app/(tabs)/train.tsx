import {useRouter} from 'expo-router';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useApp} from '../../src/store/appStore';
import {Btn, Eyebrow, Group, Row, Screen, Title} from '../../src/ui/components';
import {useTheme} from '../../src/ui/theme';

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Train() {
  const t = useTheme();
  const router = useRouter();
  const routines = useApp(s => s.routines);
  const active = useApp(s => s.active);
  const startEmpty = useApp(s => s.startEmpty);
  const startDay = useApp(s => s.startDay);
  const today = new Date().toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
  const go = async (fn: () => Promise<string | null>) => {
    const id = await fn();
    if (id) router.push(`/workout/${id}`);
  };
  return (
    <Screen>
      <SafeAreaView style={{flex: 1}} edges={['top']}>
        <ScrollView contentContainerStyle={{paddingBottom: 32}}>
          <Title side={<Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={{padding: 10}}><Text style={{fontSize: 20, color: t.ink}}>⚙</Text></Pressable>}>Train</Title>
          <Eyebrow>{today}</Eyebrow>
          {active ? (
            <Group>
              <Row label={active.label} sub="Workout in progress" onPress={() => router.push(`/workout/${active.id}`)} right={<Text style={{color: t.accentPress}}>Resume</Text>} />
            </Group>
          ) : null}
          {routines.map(r => {
            const withWork = r.days.filter(d => d.exercises.length);
            const day = withWork.find(d => d.idx === r.nextDay) || withWork[0];
            const name = day ? (day.label || WEEK[day.idx] || 'day') : 'empty';
            return (
              <Group key={r.id}>
                <Row label={r.name} sub={withWork.length ? `${withWork.length} training days` : 'No exercises yet'} />
                {day ? <View style={{padding: 12}}><Btn label={`Start ${name}`} onPress={() => go(() => startDay(r.id, day.idx))} /></View> : null}
              </Group>
            );
          })}
          <Group>
            <Row label="Start an empty workout" accent onPress={() => go(startEmpty)} />
          </Group>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
