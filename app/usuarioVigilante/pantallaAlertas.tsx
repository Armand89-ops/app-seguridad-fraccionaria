import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet } from 'react-native';
import { Avatar, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type Alerta = {
  _id?: string;
  titulo?: string;
  contenido: string;
  tipo: 'General' | 'Edificio' | string;
  nombreEdificio?: string;
  fechaEnvio?: string;
};

export default function PantallaAlertasVigilante() {
  const { idVigilante } = useLocalSearchParams<{ idVigilante?: string }>();
  const baseUrl = useMemo(() => 'http://192.168.0.103:3000', []);//ruta del backend
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    let cancel = false;
    async function cargar() {
      try {
        const data = await fetch(`${baseUrl}/verAnuncios`).then((r) => r.json());
        if (!cancel) setAlertas(Array.isArray(data) ? data : []);
      } catch {
        if (!cancel) setAlertas([]);
      }
    }
    cargar();
    return () => { cancel = true; };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Alertas</Text>
        {alertas.length === 0 && (
          <Text style={styles.screenDescription}>No hay alertas recientes.</Text>
        )}
        {alertas.map((alerta, idx) => (
          <Card key={alerta._id || idx} style={styles.card}>
            <Card.Title
              title={alerta.titulo || 'Sin título'}
              subtitle={alerta.fechaEnvio ? new Date(alerta.fechaEnvio).toLocaleString() : ''}
              left={(props) => (
                <Avatar.Icon {...props} icon="alert" color="#fff" style={{ backgroundColor: '#e34040ff' }} />
              )}
            />
            <Card.Content>
              <Text style={styles.contenido}>{alerta.contenido}</Text>
              {alerta.tipo === 'Edificio' && !!alerta.nombreEdificio && (
                <Text style={styles.edificioLabel}>Solo para: {alerta.nombreEdificio}</Text>
              )}
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5', alignItems: 'center' },
  screenTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333', textAlign: 'center' },
  screenDescription: { fontSize: 16, color: '#666', lineHeight: 24, textAlign: 'center', marginBottom: 20 },
  card: { marginBottom: 16, elevation: 3, borderRadius: 12, width: '100%', backgroundColor: '#fff' },
  contenido: { fontSize: 16, color: '#333', marginTop: 4 },
  edificioLabel: { fontSize: 13, color: '#1976d2', marginTop: 6, fontStyle: 'italic' },
});