import useAuthStore from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const roleLabels: Record<string, string> = {
  student: 'Estudiante',
  admin: 'Administrativo / Docente',
  security: 'Seguridad',
};

const zoneText: Record<string, string> = {
  student: 'Acceso a las zonas de estudiantes con cupos disponibles para tu tipo de vehículo.',
  admin: 'Acceso al panel de administración, zonas y dashboard de ocupación.',
  security: 'Acceso al escaneo de QR, búsqueda de usuarios y asignación de espacios.',
};

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlight && styles.highlight]}>{value || '—'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (!user) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const role = String(user.rol);
  const isMoto = String(user.tipoVehiculo).toLowerCase().startsWith('moto');
  const initial = (user.nombre || '?').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.headerTexts}>
          <Text style={styles.name} numberOfLines={2}>{user.nombre}</Text>
          <Text style={styles.role}>{roleLabels[role] ?? role}</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Editar perfil"
          style={styles.editButton}
          onPress={() => router.push('/editar-perfil')}
        >
          <Text style={styles.editText}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información personal</Text>
          <InfoRow label="Cédula" value={user.cedula} />
          <InfoRow label="Rol" value={roleLabels[role] ?? role} />
        </View>

        {role === 'student' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mi vehículo</Text>
            <InfoRow label="Placa" value={user.placa} highlight />
            <InfoRow label="Tipo" value={isMoto ? '🏍️ Moto' : '🚗 Carro'} />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Permisos</Text>
          <Text style={styles.permissions}>{zoneText[role] ?? ''}</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Efficient Parking v1.0 · Universidad de Cundinamarca</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f1f5f9' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  loadingText: { color: '#334155', fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 22,
    backgroundColor: '#0f3d5e',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#38bdf8' },
  avatarText: { color: '#0f3d5e', fontSize: 28, fontWeight: '800' },
  headerTexts: { flex: 1 },
  name: { color: '#fff', fontSize: 22, lineHeight: 28, fontWeight: '800' },
  role: { marginTop: 2, color: '#c9dff0', fontSize: 14 },
  editButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  editText: { fontSize: 18 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { padding: 16, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { marginBottom: 6, color: '#0f3d5e', fontSize: 17, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#eef2f6',
  },
  label: { color: '#64748b', fontSize: 15 },
  value: { flexShrink: 1, color: '#0f172a', fontSize: 16, fontWeight: '600', textAlign: 'right' },
  highlight: { color: '#0369a1', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  permissions: { color: '#334155', fontSize: 14, lineHeight: 21 },
  logoutButton: { marginTop: 6, paddingVertical: 15, borderRadius: 14, alignItems: 'center', backgroundColor: '#dc2626' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  version: { marginTop: 8, textAlign: 'center', color: '#94a3b8', fontSize: 12 },
});
