import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { DataTable } from 'react-native-paper';

type Regla = { _id?: string; regla?: string; nombre?: string };

export default function PantallaReglamentoUnidadVigilante() {
  const { idVigilante } = useLocalSearchParams<{ idVigilante?: string }>();
  const baseUrl = useMemo(() => 'http://192.168.0.103:3000', []); //ruta del backend
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function cargar() {
      try {
        const data = await fetch(`${baseUrl}/verReglas`).then((r) => r.json());
        if (!cancel) setReglas(Array.isArray(data) ? data : []);
      } catch {
        if (!cancel) setReglas([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    cargar();
    return () => { cancel = true; };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Reglamento de la unidad</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 30 }} />
        ) : (
          <DataTable style={styles.table}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 1 }}>#</DataTable.Title>
              <DataTable.Title style={{ flex: 5 }}>Regla</DataTable.Title>
            </DataTable.Header>
            {reglas.map((item, idx) => (
              <DataTable.Row key={item._id || idx}>
                <DataTable.Cell style={{ flex: 1 }}>{idx + 1}</DataTable.Cell>
                <DataTable.Cell style={{ flex: 5 }}>
                  <Text style={styles.reglaText}>{item.regla || item.nombre || ''}</Text>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        )}
        {!loading && reglas.length === 0 && (
          <Text style={{ color: '#777', marginTop: 16 }}>No hay reglas registradas.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20, alignItems: 'center' },
  screenTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333', textAlign: 'center' },
  table: { width: '100%', backgroundColor: '#fff', borderRadius: 10, elevation: 2, marginTop: 10 },
  reglaText: { flexWrap: 'wrap', flex: 1, fontSize: 15, color: '#333' },
});