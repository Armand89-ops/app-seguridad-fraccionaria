import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { DataTable } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type Pago = any;
type Usuario = any;

export default function PantallaConsultarPagosVigilante() {
  const { idVigilante } = useLocalSearchParams<{ idVigilante?: string }>();
  const baseUrl = useMemo(() => 'http://192.168.0.103:3000', []);//ruta del backend

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [edificioFiltro, setEdificioFiltro] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function cargar() {
      try {
        const [pg, us] = await Promise.all([
          fetch(`${baseUrl}/verPagos`).then((r) => r.json()).catch(() => []),
          fetch(`${baseUrl}/verUsuarios`).then((r) => r.json()).catch(() => []),
        ]);
        if (cancel) return;
        setPagos(Array.isArray(pg) ? pg : []);
        setUsuarios(Array.isArray(us) ? us : []);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    cargar();
    return () => { cancel = true; };
  }, []);

  const normalizeId = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (typeof val.$oid === 'string') return val.$oid;
      if (typeof val.toHexString === 'function') return val.toHexString();
      if (typeof val._id === 'string') return val._id;
    }
    return String(val);
  };

  // Agrupa pagos por usuario/dep/edif y se queda con el de mayor vigencia
  const pagosUnicos = Object.values(
    (pagos || []).reduce((acc: Record<string, Pago>, pago: Pago) => {
      const clave = `${normalizeId(pago.idUsuario)}_${pago.departamento || pago.Departamento || ''}_${pago.edificio || pago.Edificio || ''}`;
      const vigentePago = pago.vigencia ? new Date(pago.vigencia) : new Date(0);
      const vigenteAcc = acc[clave]?.vigencia ? new Date(acc[clave].vigencia) : new Date(0);
      if (!acc[clave] || vigentePago > vigenteAcc) acc[clave] = pago;
      return acc;
    }, {})
  ) as Pago[];

  // Al corriente (vigencia >= hoy)
  const hoy = new Date();
  const alCorriente = (pagosUnicos as Pago[]).filter((p: any) => p.vigencia && new Date(p.vigencia) >= hoy);

  // Datos usuarios
  const lista = alCorriente
    .map((pago: any) => {
      const usuario = (usuarios as any[]).find((u) => normalizeId(u._id) === normalizeId(pago.idUsuario));
      return {
        _id: pago._id,
        nombre: usuario?.NombreCompleto || pago.nombreUsuario || '',
        edificio: usuario?.Edificio || pago.edificio || '',
        departamento: usuario?.Departamento || pago.departamento || '',
        vigencia: pago.vigencia,
      };
    })
    .filter((item) =>
      (edificioFiltro ? item.edificio === edificioFiltro : true) &&
      (busqueda ? String(item.departamento).toLowerCase().includes(busqueda.toLowerCase()) : true)
    );

  const edificios = Array.from(new Set((usuarios as any[]).map((u) => u.Edificio).filter(Boolean)));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Departamentos al corriente</Text>

        {/* Filtros simples */}
        <View style={{ width: '100%', marginBottom: 10 }}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Edificio:</Text>
            <View style={styles.selectBox}>
              <Text style={styles.selectValue}>{edificioFiltro || 'Todos'}</Text>
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Buscar por departamento..."
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 20 }} />
        ) : (
          <DataTable style={styles.table}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 3 }}>Nombre</DataTable.Title>
              <DataTable.Title style={{ flex: 2 }}>Edificio</DataTable.Title>
              <DataTable.Title style={{ flex: 2 }}>Dep.</DataTable.Title>
              <DataTable.Title style={{ flex: 3 }}>Vigente hasta</DataTable.Title>
            </DataTable.Header>
            {lista.map((item, idx) => (
              <DataTable.Row key={item._id || idx}>
                <DataTable.Cell style={{ flex: 3 }}>{item.nombre}</DataTable.Cell>
                <DataTable.Cell style={{ flex: 2 }}>{item.edificio}</DataTable.Cell>
                <DataTable.Cell style={{ flex: 2 }}>{item.departamento}</DataTable.Cell>
                <DataTable.Cell style={{ flex: 3 }}>{new Date(item.vigencia).toLocaleDateString()}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        )}
        {!loading && lista.length === 0 && (
          <Text style={{ color: '#777', marginTop: 16 }}>No hay departamentos al corriente.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  input: { backgroundColor: '#fff', borderRadius: 6, padding: 10, marginTop: 8 },
  table: { width: '100%', backgroundColor: '#fff', borderRadius: 10, elevation: 2, marginTop: 10 },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterLabel: { fontWeight: '600', color: '#333' },
  selectBox: { backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  selectValue: { color: '#333' },
});