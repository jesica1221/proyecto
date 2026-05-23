import { ThemedText } from '@/components/themed-text';
import Config from '@/constants/config';
import useAuthStore from '@/store/useAuthStore';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

export default function ZonaAdminScreen() {

    const { zonaId, zonaNombre, zonaColor } = useLocalSearchParams();
    const { token, getAuthHeaders } = useAuthStore();

    const [espacios, setEspacios] = useState<any[]>([]);
    const [selectedEspacio, setSelectedEspacio] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const cargarZona = async () => {

        try {
            console.log('Cargando zona:', zonaId);
            console.log('Token:', token);

            const response = await fetch(
                `${Config.API_BASE_URL}/admin_espacios.php?token=${encodeURIComponent(token || '')}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders(),
                    },
                }
            );

            const data = await response.json();
            console.log('Zona data:', data);

            const todos = [
                ...(data.libres || []),
                ...(data.ocupados || []),
                ...(data.porVencer || []),
            ];

            const filtrados = todos.filter(
                (e: any) => Number(e.zonaId) === Number(zonaId)
            );

            setEspacios(filtrados);

        } catch (error) {

            console.log(error);

        }

    };

    useEffect(() => {

        cargarZona();

        const interval = setInterval(() => {

            cargarZona();

        }, 5000);

        return () => clearInterval(interval);

    }, []);

    const libres = espacios.filter(
        e => e.estado === "libre"
    );

    const ocupados = espacios.filter(
        e => e.estado === "ocupado"
    );

    const porVencer = espacios.filter(
        e => e.estado === "por vencer"
    );

    const abrirModal = (espacio: any) => {

        if (espacio.estado === "libre") return;

        setSelectedEspacio(espacio);
        setModalVisible(true);

    };

    return (

        <ScrollView style={styles.container}>

            {/* HEADER */}
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor: String(zonaColor)
                    }
                ]}
            >

                <ThemedText style={styles.headerTitle}>
                    {zonaNombre}
                </ThemedText>

            </View>

            {/* ESTADÍSTICAS */}
            <View style={styles.statsContainer}>

                <View
                    style={[
                        styles.statCard,
                        { backgroundColor: '#22C55E' }
                    ]}
                >

                    <ThemedText style={styles.statNumber}>
                        {libres.length}
                    </ThemedText>

                    <ThemedText style={styles.statLabel}>
                        Libres
                    </ThemedText>

                </View>

                <View
                    style={[
                        styles.statCard,
                        { backgroundColor: '#EF4444' }
                    ]}
                >

                    <ThemedText style={styles.statNumber}>
                        {ocupados.length}
                    </ThemedText>

                    <ThemedText style={styles.statLabel}>
                        Ocupados
                    </ThemedText>

                </View>

                <View
                    style={[
                        styles.statCard,
                        { backgroundColor: '#F59E0B' }
                    ]}
                >

                    <ThemedText style={styles.statNumber}>
                        {porVencer.length}
                    </ThemedText>

                    <ThemedText style={styles.statLabel}>
                        Por vencer
                    </ThemedText>

                </View>

            </View>

            {/* ESPACIOS */}
            <View style={styles.grid}>

                {espacios.map((espacio: any) => (

                    <TouchableOpacity
                        key={espacio.id}
                        style={[
                            styles.box,

                            {
                                backgroundColor:
                                    espacio.estado === "libre"
                                        ? "#22C55E"
                                        : espacio.estado === "por vencer"
                                            ? "#F59E0B"
                                            : "#EF4444",
                            }
                        ]}
                        onPress={() => abrirModal(espacio)}
                    >

                        <ThemedText style={styles.boxText}>
                            {espacio.numero}
                        </ThemedText>

                    </TouchableOpacity>

                ))}

            </View>

            {/* MODAL */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
            >

                <View style={styles.modalOverlay}>

                    <View style={styles.modalBox}>

                        <ThemedText style={styles.modalTitle}>
                            👤 Usuario
                        </ThemedText>

                        <ThemedText>
                            Nombre: {selectedEspacio?.nombre}
                        </ThemedText>

                        <ThemedText>
                            Cédula: {selectedEspacio?.cedula}
                        </ThemedText>

                        <ThemedText>
                            Espacio: #{selectedEspacio?.numero}
                        </ThemedText>

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setModalVisible(false)}
                        >

                            <ThemedText style={{ color: '#fff' }}>
                                Cerrar
                            </ThemedText>

                        </TouchableOpacity>

                    </View>

                </View>

            </Modal>

        </ScrollView>

    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },

    header: {
        padding: 25,
        paddingTop: 50,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },

    headerTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },

    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
    },

    statCard: {
        width: '31%',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },

    statNumber: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },

    statLabel: {
        color: '#fff',
        fontSize: 12,
        marginTop: 4,
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        paddingBottom: 30,
    },

    box: {
        width: 60,
        height: 60,
        margin: 6,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    boxText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },

    modalBox: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },

    closeBtn: {
        backgroundColor: '#3B82F6',
        marginTop: 20,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },

});