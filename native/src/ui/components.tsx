import type {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {useTheme} from './theme';
import type {Theme} from './tokens';

export function Screen({children, style}: {children: ReactNode; style?: ViewStyle}) {
  const t = useTheme();
  return <View style={[{flex: 1, backgroundColor: t.bg}, style]}>{children}</View>;
}

export function Title({children, side}: {children: string; side?: ReactNode}) {
  const t = useTheme();
  return (
    <View style={styles.titleRow}>
      <Text style={[styles.title, {color: t.ink}]}>{children}</Text>
      {side}
    </View>
  );
}

export function Eyebrow({children}: {children: string}) {
  const t = useTheme();
  return <Text style={[styles.eyebrow, {color: t.text2}]}>{children}</Text>;
}

export function Group({children}: {children: ReactNode}) {
  const t = useTheme();
  return <View style={[styles.group, {backgroundColor: t.paper, marginBottom: 16}]}>{children}</View>;
}

export function Row({label, sub, onPress, right, accent}: {label: string; sub?: string; onPress?: () => void; right?: ReactNode; accent?: boolean}) {
  const t = useTheme();
  const body = (
    <View style={[styles.row, {borderTopColor: t.line}]}>
      <View style={{flex: 1}}>
        <Text style={[styles.rowLabel, {color: accent ? t.accentPress : t.ink}]}>{label}</Text>
        {sub ? <Text style={[styles.sub, {color: t.text2}]}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return body;
  return <Pressable onPress={onPress} accessibilityRole="button">{body}</Pressable>;
}

export function Btn({label, onPress, kind = 'accent'}: {label: string; onPress: () => void; kind?: 'accent' | 'ink' | 'grey'}) {
  const t = useTheme();
  const bg = kind === 'accent' ? t.accent : kind === 'ink' ? t.ink : t.fill;
  const fg = kind === 'grey' ? t.ink : t.onInk;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.btn, {backgroundColor: bg}]}>
      <Text style={[styles.btnText, {color: fg}]}>{label}</Text>
    </Pressable>
  );
}

export function Foot({children}: {children: string}) {
  const t = useTheme();
  return <Text style={[styles.foot, {color: t.text2}]}>{children}</Text>;
}

const styles = StyleSheet.create({
  titleRow: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8},
  title: {fontSize: 34, fontWeight: '700', letterSpacing: -0.4},
  eyebrow: {fontSize: 15, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12},
  group: {marginHorizontal: 16, borderRadius: 12, overflow: 'hidden'},
  row: {minHeight: 46, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth},
  rowLabel: {fontSize: 17},
  sub: {fontSize: 13, marginTop: 2},
  btn: {minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16},
  btnText: {fontSize: 17, fontWeight: '600'},
  foot: {fontSize: 13, lineHeight: 18, paddingHorizontal: 20, paddingTop: 8},
});

export type {Theme};
