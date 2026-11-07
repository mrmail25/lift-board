import {File, Paths} from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import {useRouter} from 'expo-router';
import {Alert, Pressable, ScrollView, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useApp} from '../src/store/appStore';
import {Foot, Group, Row, Screen} from '../src/ui/components';
import {useTheme} from '../src/ui/theme';

const THEMES = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']] as const;

export default function Settings() {
  const router = useRouter();
  const t = useTheme();
  const unit = useApp(s => s.unit);
  const theme = useApp(s => s.theme);
  const effort = useApp(s => s.effort);
  const setUnit = useApp(s => s.setUnit);
  const setTheme = useApp(s => s.setTheme);
  const setEffort = useApp(s => s.setEffort);
  const api = useApp(s => s.api);
  const refresh = useApp(s => s.refresh);

  const backup = async () => {
    if (!api) return;
    const {text} = await api.exportBackup();
    const file = new File(Paths.cache, 'apechit-backup.json');
    if (!file.exists) file.create();
    await file.write(text);
    await Sharing.shareAsync(file.uri, {mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Back up ApeChit'});
  };

  const restore = async () => {
    if (!api) return;
    const picked = await DocumentPicker.getDocumentAsync({type: 'application/json', copyToCacheDirectory: true});
    if (picked.canceled || !picked.assets[0]) return;
    const text = await new File(picked.assets[0].uri).text();
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { Alert.alert('Not a backup', 'This file is not JSON. Nothing was changed.'); return; }
    const kind = raw && typeof raw === 'object' && 'kind' in raw ? (raw as {kind?: string}).kind : '';
    const app = raw && typeof raw === 'object' && 'app' in raw ? (raw as {app?: string}).app : '';
    if (kind === 'apechit.backup') {
      Alert.alert('Restore backup', 'Replace workouts, routines, and settings on this phone with this file? Photos and videos are not in the file.', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Replace', style: 'destructive', onPress: () => run(api.restoreBackup(raw, true))},
      ]);
    } else if (app === 'lift-board' || (raw && typeof raw === 'object' && 'sessions' in (raw as object))) {
      Alert.alert('Lift Board file', 'Add the workouts and routines from this Lift Board backup? What is already on this phone stays, unless it has the same id.', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Add', onPress: () => run(api.importLiftBoard(raw))},
      ]);
    } else {
      Alert.alert('Not a backup', 'This file is not an ApeChit or Lift Board backup. Nothing was changed.');
    }
  };

  const run = async (p: Promise<{ok: boolean; message?: string}>) => {
    const res = await p;
    if (!res.ok) Alert.alert('Not restored', res.message || 'Nothing was changed.');
    else { await refresh(); Alert.alert('Saved', 'The file is on this phone.'); }
  };

  return (
    <Screen>
      <SafeAreaView style={{flex: 1}} edges={['top']}>
        <ScrollView contentContainerStyle={{paddingBottom: 40}}>
          <Pressable onPress={() => router.back()} style={{padding: 16}}><Text style={{color: t.accentPress, fontSize: 17}}>‹ Train</Text></Pressable>
          <Text style={{fontSize: 34, fontWeight: '700', color: t.ink, paddingHorizontal: 16, marginBottom: 16}}>Settings</Text>
          <Group>
            <Row label="Appearance" right={<Text style={{color: t.text2}}>{THEMES.find(x => x[0] === theme)?.[1]}</Text>} />
            <Row label="System" onPress={() => setTheme('system')} right={theme === 'system' ? <Text style={{color: t.accent}}>✓</Text> : null} />
            <Row label="Light" onPress={() => setTheme('light')} right={theme === 'light' ? <Text style={{color: t.accent}}>✓</Text> : null} />
            <Row label="Dark" onPress={() => setTheme('dark')} right={theme === 'dark' ? <Text style={{color: t.accent}}>✓</Text> : null} />
          </Group>
          <Group>
            <Row label="Units" right={<Text style={{color: t.ink}}>{unit}</Text>} />
            <Row label="lb" onPress={() => setUnit('lb')} right={unit === 'lb' ? <Text style={{color: t.accent}}>✓</Text> : null} />
            <Row label="kg" onPress={() => setUnit('kg')} right={unit === 'kg' ? <Text style={{color: t.accent}}>✓</Text> : null} />
          </Group>
          <Text style={{fontSize: 13, color: t.text2, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6}}>WORKOUT</Text>
          <Group>
            <Row label="Show effort as RPE" sub={effort === 'rpe' ? 'RPE 10 to 6 on each set' : 'Reps in reserve (RIR) 0 to 4+ on each set'} onPress={() => setEffort(effort === 'rpe' ? 'rir' : 'rpe')} right={<Text style={{color: t.accent}}>{effort === 'rpe' ? 'On' : 'Off'}</Text>} />
          </Group>
          <Text style={{fontSize: 13, color: t.text2, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6}}>DATA</Text>
          <Group>
            <Row label="Back up to file" accent onPress={() => backup().catch(e => Alert.alert('Backup failed', e instanceof Error ? e.message : 'Nothing was uploaded.'))} />
            <Row label="Restore from file" accent onPress={() => restore().catch(e => Alert.alert('Restore failed', e instanceof Error ? e.message : 'Nothing was changed.'))} />
          </Group>
          <Foot>A backup file holds routines, workouts, settings, and custom exercise names and notes. Photos and videos are not in the file. Nothing is sent to a server. iCloud is not on.</Foot>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
