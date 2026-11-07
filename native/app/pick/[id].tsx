import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect, useState} from 'react';
import {FlatList, Pressable, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CATALOG} from '../../src/data/exercises.slim';
import {useApp} from '../../src/store/appStore';
import {Screen} from '../../src/ui/components';
import {useTheme} from '../../src/ui/theme';

export default function Pick() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const t = useTheme();
  const add = useApp(s => s.addExercise);
  const api = useApp(s => s.api);
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState<{id: string; name: string}[]>([]);
  useEffect(() => { api?.listCustom().then(setCustom); }, [api]);
  const query = q.trim().toLowerCase();
  const rows = [
    ...custom.map(c => ({id: c.id, name: c.name, type: 'custom'})),
    ...CATALOG.map(c => ({id: c.id, name: c.name, type: c.type})),
  ].filter(r => !query || r.name.toLowerCase().includes(query) || r.id.includes(query)).slice(0, 80);
  return (
    <Screen>
      <SafeAreaView style={{flex: 1}} edges={['top']}>
        <View style={{flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8}}>
          <Pressable accessibilityLabel="Close" onPress={() => router.back()}><Text style={{color: t.accentPress, fontSize: 17}}>Close</Text></Pressable>
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder={`Search ${CATALOG.length} exercises`} placeholderTextColor={t.text3} accessibilityLabel="Search exercises" style={{flex: 1, fontSize: 17, color: t.ink, backgroundColor: t.fill, borderRadius: 10, paddingHorizontal: 12, minHeight: 44}} />
        </View>
        <FlatList data={rows} keyExtractor={r => r.id} keyboardShouldPersistTaps="handled" renderItem={({item}) => (
          <Pressable onPress={async () => { if (id) { await add(id, item.id, item.name); router.back(); } }} style={{minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', borderTopWidth: 0.5, borderTopColor: t.line}}>
            <Text style={{color: t.ink, fontSize: 17}}>{item.name}</Text>
            <Text style={{color: t.text2, fontSize: 13}}>{item.type}</Text>
          </Pressable>
        )} />
      </SafeAreaView>
    </Screen>
  );
}
