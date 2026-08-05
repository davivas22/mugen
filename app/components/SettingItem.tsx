import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { COLORS } from '../theme/theme';

interface Props {
  label: string;
  icon: string;
  value?: string;
  subtitle?: string;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (val: boolean) => void;
  showChevron?: boolean;
  onPress?: () => void;
}

const SettingItem = ({
  label,
  icon,
  value,
  subtitle,
  isSwitch = false,
  switchValue = false,
  onSwitchChange,
  showChevron = true,
  onPress,
}: Props) => {
  const { C } = useColors();

  const content = (
    <View style={styles.row}>
      <View style={[styles.iconWrapper, { backgroundColor: C.mugenPink + '15' }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={C.mugenPink} />
      </View>
      <View style={styles.textWrapper}>
        <Text style={[styles.label, { color: C.textPrimary }]}>{label}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: C.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ true: C.mugenPink, false: C.textMuted }}
          thumbColor="#FFFFFF"
        />
      ) : value ? (
        <Text style={[styles.value, { color: C.textSecondary }]}>{value}</Text>
      ) : showChevron ? (
        <MaterialCommunityIcons name="chevron-right" size={20} color={C.textMuted} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.container}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SettingItem;
