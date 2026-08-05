import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme/theme';

interface Props {
  onLogout: () => void;
  onDeleteAccount: () => void;
}

const DangerZone = ({ onLogout, onDeleteAccount }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>ZONA DE PELIGRO</Text>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={onDeleteAccount} activeOpacity={0.8}>
        <Text style={styles.deleteText}>Eliminar cuenta</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#EF4444',
    marginBottom: 12,
    marginLeft: 4,
  },
  logoutButton: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  deleteText: {
    color: COLORS.slateGray,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default DangerZone;
