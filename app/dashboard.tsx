import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { Config } from '@/constants/config';
import { useAuthStore } from '@/store/useAuthStore';

type DashboardData = {
  actualizado: string;
  metricas: {
    capacidad: number;
    ocupados: number;
    disponibles: number;
    ocupacionPct: number;
    eventosHoy: number;
  };
  zonas: {
    id: number;
    nombre: string;
    tipoVehiculo: string;
    capacidad: number;
    ocupados: number;
    disponibles: number;
  }[];
  actividadPorHora: { hour: number; count: number }[];
  vehiculosUltimos7Dias: { tipo: string; total: number }[];
};

const colors = {
  background: '#F4F7FB',
  ink: '#14243A',
  muted: '#64748B',
  blue: '#2563EB',
  green: '#0E9F6E',
  amber: '#D97706',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export default function DashboardScreen() {
  const router = useRouter();
  const { token, user, logout } = useAuthStore();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const isWide = width >= 900;

  const loadDashboard = useCallback(async () => {
    if (!token || user?.rol !== 'admin') {
      setError('Este tablero está disponible para cuentas administradoras.');
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(Config.DASHBOARD_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No fue posible cargar el tablero.');
      }
      setData(result);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible conectar con la API.');
    } finally {
      setLoading(false);
    }
  }, [token, user?.rol]);

  useEffect(() => {
    void loadDashboard();
    const timer = setInterval(() => void loadDashboard(), 5000);
    return () => clearInterval(timer);
  }, [loadDashboard]);

  const signOut = () => {
    logout();
    router.replace('/login');
  };

  const maxHourly = Math.max(1, ...(data?.actividadPorHora.map((item) => item.count) ?? [0]));
  const chartWidth = Math.max(320, Math.min(width - 64, isWide ? 720 : 640));
  const chartHeight = 205;
  const chartBars = data?.actividadPorHora ?? [];
  const vehicleMax = Math.max(1, ...(data?.vehiculosUltimos7Dias.map((item) => item.total) ?? [0]));

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={[styles.shell, isWide && styles.shellWide]}>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.brand}>EFICIENT PARKING</Text>
            <Text style={styles.subtitle}>Panel de control · Girardot</Text>
          </View>
          <View style={styles.topActions}>
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>EN VIVO</Text></View>
            <TouchableOpacity onPress={() => router.replace('/admin')} style={styles.navButton}>
              <Text style={styles.navButtonText}>Operación</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={signOut} style={styles.navButton}>
              <Text style={styles.navButtonText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heading}>
          <View>
            <Text style={styles.title}>Dashboard de ocupación</Text>
            <Text style={styles.description}>Disponibilidad, actividad y comportamiento de uso de las zonas.</Text>
          </View>
          <TouchableOpacity onPress={() => void loadDashboard()} style={styles.refreshButton}>
            <Text style={styles.refreshText}>Actualizar ahora</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>No se pudo actualizar</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>Verifica que la API esté activa y que la URL esté configurada.</Text>
          </View>
        ) : null}

        {loading && !data ? (
          <View style={styles.loading}><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.muted}>Conectando con el sistema...</Text></View>
        ) : null}

        {data ? (
          <>
            <View style={styles.metricGrid}>
              <Metric label="Ocupación actual" value={`${data.metricas.ocupacionPct}%`} detail={`${data.metricas.ocupados} espacios ocupados`} accent={colors.blue} />
              <Metric label="Espacios disponibles" value={data.metricas.disponibles} detail={`de ${data.metricas.capacidad} en total`} accent={colors.green} />
              <Metric label="Eventos de hoy" value={data.metricas.eventosHoy} detail="reservas y asignaciones" accent={colors.amber} />
            </View>

            <View style={[styles.visualGrid, isWide && styles.visualGridWide]}>
              <View style={[styles.card, isWide && styles.activityCard]}>
                <Text style={styles.cardTitle}>Actividad por hora</Text>
                <Text style={styles.cardDescription}>Reservas y asignaciones registradas hoy</Text>
                <View style={styles.chartFrame}>
                  <Svg width={chartWidth} height={chartHeight}>
                    <Line x1="36" y1="165" x2={chartWidth - 10} y2="165" stroke={colors.border} strokeWidth="1" />
                    {chartBars.map((item, index) => {
                      const slotWidth = (chartWidth - 58) / Math.max(chartBars.length, 1);
                      const barHeight = Math.max(4, (item.count / maxHourly) * 120);
                      const x = 38 + index * slotWidth;
                      const hour = String(item.hour).padStart(2, '0');
                      return (
                        <React.Fragment key={item.hour}>
                          <Rect x={x + 3} y={165 - barHeight} width={Math.max(4, slotWidth - 7)} height={barHeight} rx="4" fill={colors.blue} opacity="0.88" />
                          <SvgText x={x + slotWidth / 2} y="187" fontSize="10" fill={colors.muted} textAnchor="middle">{hour}</SvgText>
                        </React.Fragment>
                      );
                    })}
                  </Svg>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Demanda por vehículo</Text>
                <Text style={styles.cardDescription}>Actividad de los últimos 7 días</Text>
                {data.vehiculosUltimos7Dias.length ? data.vehiculosUltimos7Dias.map((item) => (
                  <View key={item.tipo} style={styles.vehicleRow}>
                    <View style={styles.vehicleLabel}><Text style={styles.vehicleName}>{item.tipo}</Text><Text style={styles.vehicleValue}>{item.total}</Text></View>
                    <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(4, item.total / vehicleMax * 100)}%` }]} /></View>
                  </View>
                )) : <Text style={styles.emptyText}>Aún no hay actividad para mostrar.</Text>}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.tableHeading}>
                <View><Text style={styles.cardTitle}>Estado por zona</Text><Text style={styles.cardDescription}>Actualización automática cada 5 segundos</Text></View>
                <Text style={styles.updatedAt}>Actualizado {new Date(data.actualizado).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
              </View>
              {data.zonas.map((zone) => {
                const percent = zone.capacidad ? Math.round(zone.ocupados * 100 / zone.capacidad) : 0;
                return (
                  <View key={zone.id} style={styles.zoneRow}>
                    <View style={styles.zoneInfo}>
                      <Text style={styles.zoneName}>{zone.nombre}</Text>
                      <Text style={styles.zoneType}>{zone.tipoVehiculo === 'moto' ? 'Motocicletas' : 'Automóviles'}</Text>
                    </View>
                    <View style={styles.zoneMeter}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View><Text style={styles.zoneStat}>{zone.ocupados}/{zone.capacidad}</Text></View>
                    <Text style={styles.available}>{zone.disponibles} libres</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.footer}>Fuente: registros operativos compartidos por la aplicación móvil y web.</Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Metric({ label, value, detail, accent }: { label: string; value: string | number; detail: string; accent: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricAccent, { backgroundColor: accent }]} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingVertical: 22, alignItems: 'center' },
  shell: { width: '100%', maxWidth: 1180, gap: 22 },
  shellWide: { gap: 24 },
  topbar: { minHeight: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  brand: { color: colors.blue, fontWeight: '800', fontSize: 13, letterSpacing: 1.6 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#E7F7F0', borderRadius: 20 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  liveText: { color: '#08764F', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  navButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.white },
  navButtonText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800' },
  description: { color: colors.muted, marginTop: 5, fontSize: 13 },
  refreshButton: { borderRadius: 9, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: colors.blue },
  refreshText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metricCard: { flexGrow: 1, flexBasis: 220, minHeight: 126, padding: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' },
  metricAccent: { width: 28, height: 3, borderRadius: 2, marginBottom: 13 },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  metricValue: { color: colors.ink, fontSize: 30, fontWeight: '800', marginTop: 4 },
  metricDetail: { color: colors.muted, fontSize: 11, marginTop: 3 },
  visualGrid: { gap: 16 },
  visualGridWide: { flexDirection: 'row', alignItems: 'stretch' },
  card: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 18 },
  activityCard: { flex: 1.55 },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  cardDescription: { color: colors.muted, marginTop: 4, fontSize: 11 },
  chartFrame: { minHeight: 205, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  vehicleRow: { marginTop: 20 },
  vehicleLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  vehicleName: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  vehicleValue: { color: colors.muted, fontSize: 12 },
  progressTrack: { height: 8, backgroundColor: '#EAF0F8', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', minWidth: 2, backgroundColor: colors.blue, borderRadius: 6 },
  emptyText: { color: colors.muted, fontSize: 12, marginTop: 24 },
  tableHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 },
  updatedAt: { color: colors.muted, fontSize: 10 },
  zoneRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, gap: 14, paddingVertical: 11 },
  zoneInfo: { flex: 1.25 },
  zoneName: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  zoneType: { color: colors.muted, fontSize: 10, marginTop: 3 },
  zoneMeter: { flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 10 },
  zoneStat: { color: colors.muted, fontSize: 10, width: 38, textAlign: 'right' },
  available: { color: colors.green, fontSize: 11, fontWeight: '700', minWidth: 58, textAlign: 'right' },
  footer: { color: colors.muted, fontSize: 10, textAlign: 'center', paddingBottom: 8 },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.muted, fontSize: 12 },
  errorBox: { borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFF1F2', borderRadius: 12, padding: 16 },
  errorTitle: { color: '#B91C1C', fontWeight: '800', fontSize: 13 },
  errorText: { color: '#7F1D1D', fontSize: 12, marginTop: 5 },
  errorHint: { color: '#7F1D1D', fontSize: 10, marginTop: 5 },
});
