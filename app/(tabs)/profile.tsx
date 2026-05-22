import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import useAuthStore from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Cargando...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.profileHeader}>
          <ThemedView style={styles.avatarContainer}>
            <ThemedText style={styles.avatar}>
              {user.rol === 'student' ? '' : user.rol === 'admin' ? '' : ''}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.headerContent}>
            <ThemedText type="title">{user.nombre}</ThemedText>
            <ThemedText style={styles.roleLabel}>
              {user.rol === 'student'
                ? 'Estudiante'
                : user.rol === 'admin'
                  ? 'Administrativo/Docente'
                  : 'Seguridad'}
            </ThemedText>
          </ThemedView>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/editar-perfil')}
          >
            <ThemedText style={styles.editButtonText}>✏️</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle"> Información Personal</ThemedText>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>Cédula:</ThemedText>
            <ThemedText style={styles.value}>{user.cedula}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>Rol:</ThemedText>
            <ThemedText style={styles.value}>
              {user.rol === 'student'
                ? 'Estudiante'
                : user.rol === 'admin'
                  ? 'Administrativo/Docente'
                  : 'Seguridad'}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle"> Información del Vehículo</ThemedText>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>Placa:</ThemedText>
            <ThemedText style={[styles.value, styles.plateValue]}>{user.placa}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoRow}>
            <ThemedText style={styles.label}>Tipo:</ThemedText>
            <ThemedText style={styles.value}>
              {user.tipoVehiculo === 'car' ? ' Auto' : ' Moto'}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle"> Zonas Permitidas</ThemedText>
          <ThemedText style={styles.permissionsText}>
            {user.rol === 'student'
              ? 'Acceso a zonas de estudiantes'
              : user.rol === 'admin'
                ? 'Acceso a zonas administrativas/docentes'
                : 'Acceso a zonas de seguridad'}
          </ThemedText>
        </ThemedView>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText style={styles.logoutButtonText}>Cerrar Sesión</ThemedText>
        </TouchableOpacity>

        <ThemedView style={styles.versionContainer}>
          <ThemedText style={styles.versionText}>Parking Seguro v1.0.0</ThemedText>
          <ThemedText style={styles.versionText}>Sistema de Parqueadero Universitario</ThemedText>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerContent: {
    flex: 1,
  },
  editButton: {
    backgroundColor: '#334155',
    padding: 10,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 18,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e7f3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    fontSize: 40,
  },
  roleLabel: {
    marginTop: 4,
    opacity: 0.7,
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  label: {
    fontWeight: '600',
    flex: 1,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
  plateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
  },
  permissionsText: {
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: '#e7f3ff',
    padding: 8,
    borderRadius: 4,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
    marginTop: 16,
  },
  versionText: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'center',
  },
});
