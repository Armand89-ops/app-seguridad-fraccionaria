import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { DataTable } from 'react-native-paper';

type Pago = {
  _id?: string;
  tipoPago?: string;
  metodoPago?: string;
  monto?: number;
  fechaPago?: string;
  idUsuario?: string | { $oid: string };
};

export default function PantallaHistorialPagosResidente() {
  const { idResidente } = useLocalSearchParams<{ idResidente?: string }>();
  const baseUrl = useMemo(() => 'http://192.168.0.103:3000', []);//ruta del backend
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function cargar() {
      if (!idResidente) { setLoading(false); return; }
      try {
        const data = await fetch(`${baseUrl}/verPagosResidente/${idResidente}`).then((r) => r.json());
        if (!cancel) setPagos(Array.isArray(data) ? data : []);
      } catch {
        if (!cancel) setPagos([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    cargar();
    return () => { cancel = true; };
  }, [idResidente]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Historial de pagos</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 30 }} />
        ) : (
          <DataTable style={styles.table}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 2 }}>Tipo</DataTable.Title>
              <DataTable.Title style={{ flex: 2 }}>Método</DataTable.Title>
              <DataTable.Title style={{ flex: 2 }}>Monto</DataTable.Title>
              <DataTable.Title style={{ flex: 3 }}>Fecha de pago</DataTable.Title>
            </DataTable.Header>
            {pagos.map((pago, idx) => (
              <DataTable.Row key={pago._id || idx}>
                <DataTable.Cell style={{ flex: 2 }}>{pago.tipoPago || '-'}</DataTable.Cell>
                <DataTable.Cell style={{ flex: 2 }}>{pago.metodoPago || '-'}</DataTable.Cell>
                <DataTable.Cell style={{ flex: 2 }}>${pago.monto ?? '-'}</DataTable.Cell>
                <DataTable.Cell style={{ flex: 3 }}>{pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString() : '-'}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        )}
        {!loading && pagos.length === 0 && (
          <Text style={{ color: '#777', marginTop: 16 }}>No hay pagos registrados.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  table: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    marginTop: 10,
  },
});