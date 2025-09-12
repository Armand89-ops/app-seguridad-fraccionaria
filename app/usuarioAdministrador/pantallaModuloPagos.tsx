import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, DataTable, FAB, Modal as PaperModal, Portal, RadioButton, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type Pago = {
  _id?: string;
  edificio: string;
  departamento: string;
  idUsuario: string;
  nombreUsuario: string;
  tipoPago: 'Semanal' | 'Mensual' | 'Anual' | string;
  metodoPago: 'Manual' | 'Transferencia' | string;
  monto: number | string;
  fechaPago: string;
  vigencia: string; // YYYY-MM-DD
  estatus: string; 
  procesadoPor?: string;
  referenciaStripe?: string;
};

type Usuario = {
  _id: string | { $oid?: string };
  NombreCompleto?: string;
  Edificio?: string;
  Departamento?: string;
  Telefono?: string;
  email?: string;
  TipoUsuario?: string;
  Ine?: string;
};

function normalizeId(id: any): string {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && id.$oid) return String(id.$oid);
  if (typeof id === 'object' && id.toString) return String(id.toString());
  return String(id);
}

export default function PantallaModuloPagos() {
  const { idAdmin } = useLocalSearchParams<{ idAdmin?: string }>();

  const baseUrl = useMemo(() => 'http://192.168.0.103:3000', []);//ruta del backend

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [edificioFiltro, setEdificioFiltro] = useState('');
  const [departamentoFiltro, setDepartamentoFiltro] = useState('');
  const [selectorEdificioVisible, setSelectorEdificioVisible] = useState(false);
  const [selectorDepartamentoVisible, setSelectorDepartamentoVisible] = useState(false);
  const [selectorUsuarioVisible, setSelectorUsuarioVisible] = useState(false);
  const [modalUsuarioInfoVisible, setModalUsuarioInfoVisible] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);

  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [datosPago, setDatosPago] = useState<Pago>({
    edificio: '',
    departamento: '',
    idUsuario: '',
    nombreUsuario: '',
    tipoPago: '',
    metodoPago: '',
    monto: '' as any,
    fechaPago: '',
    vigencia: '',
    estatus: 'vigente',
    procesadoPor: idAdmin || '',
    referenciaStripe: '',
  });

  useEffect(() => {
    fetch(`${baseUrl}/verPagos`).then(r => r.json()).then(setPagos).catch(() => setPagos([]));
    fetch(`${baseUrl}/verUsuarios`).then(r => r.json()).then(setUsuarios).catch(() => setUsuarios([]));
  }, []);

  const formatYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];

  const addPeriodo = (base: Date, tipo: string) => {
    const v = new Date(base);
    if (tipo === 'Semanal') v.setDate(v.getDate() + 7);
    else if (tipo === 'Mensual') v.setMonth(v.getMonth() + 1);
    else if (tipo === 'Anual') v.setFullYear(v.getFullYear() + 1);
    return v;
  };

  const getUltimaVigencia = (idUsuario: string, edificio: string, departamento: string): Date | null => {
    if (!idUsuario || !edificio || !departamento) return null;
    const idN = normalizeId(idUsuario);
    const candidatos = pagos.filter((p) => normalizeId((p as any).idUsuario) === idN && p.edificio === edificio && p.departamento === departamento);
    let max: Date | null = null;
    for (const p of candidatos) {
      const d = new Date(p.vigencia);
      if (!isNaN(d as any)) {
        if (!max || d > max) max = d;
      }
    }
    return max;
  };

  const calcularVigenciaExtendida = (tipo: string, idUsuario: string, edificio: string, departamento: string) => {
    const hoy = new Date();
    const ultima = getUltimaVigencia(idUsuario, edificio, departamento);
    const base = ultima && ultima > hoy ? ultima : hoy;
    return formatYYYYMMDD(addPeriodo(base, tipo));
  };

  // Listas únicas para edificios y departamentos
  const edificios = Array.from(new Set(pagos.map(p => p.edificio).filter(Boolean)));
  const departamentos = edificioFiltro
    ? Array.from(new Set(pagos.filter(p => p.edificio === edificioFiltro).map(p => p.departamento).filter(Boolean)))
    : Array.from(new Set(pagos.map(p => p.departamento).filter(Boolean)));

  // Filtrado y únicos (por usuario+edificio+departamento) para mostrar en la tabla
  const pagosUnicos = Object.values(
    pagos.reduce((acc: Record<string, Pago>, pago: Pago) => {
      const clave = `${normalizeId((pago as any).idUsuario)}_${pago.departamento}_${pago.edificio}`;
      if (!acc[clave] || new Date(pago.vigencia) > new Date(acc[clave].vigencia)) acc[clave] = pago;
      return acc;
    }, {})
  ) as Pago[];

  const pagosFiltrados = pagosUnicos.filter(p =>
    (edificioFiltro ? p.edificio === edificioFiltro : true) &&
    (departamentoFiltro ? p.departamento === departamentoFiltro : true)
  );

  const abrirInfoUsuario = (pago: Pago) => {
    const idU = normalizeId((pago as any).idUsuario);
    const u = usuarios.find((us) => normalizeId(us._id) === idU) || null;
    setUsuarioSeleccionado(u);
    setPagoSeleccionado(pago);
    setModalUsuarioInfoVisible(true);
  };

  const validar = (d: Pago) => {
    if (!d.idUsuario) return 'Selecciona un usuario.';
    if (!d.tipoPago) return 'Selecciona el tipo de pago.';
    if (!d.metodoPago) return 'Selecciona el método de pago.';
    const montoNum = typeof d.monto === 'string' ? parseFloat(d.monto) : d.monto;
    if (!montoNum || isNaN(montoNum) || montoNum <= 0) return 'Ingresa un monto válido (> 0).';
    return '';
  };

  const agregarPago = async (payload: Pago) => {
    try {
      const res = await fetch(`${baseUrl}/agregarPago`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.mensaje || 'No se pudo agregar el pago');
      return data;
    } catch (e: any) {
      Alert.alert('Error', `No se pudo agregar el pago: ${e.message}`);
      return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <FAB size="large" icon="plus" color="#000000ff" style={styles.fab} onPress={() => {
          setModalAgregarVisible(true);
          setDatosPago({ edificio: '', departamento: '', idUsuario: '', nombreUsuario: '', tipoPago: '', metodoPago: '', monto: '' as any, fechaPago: '', vigencia: '', estatus: 'vigente', procesadoPor: idAdmin || '', referenciaStripe: '' });
        }} />

        {/* Filtros */}
        <View style={styles.filtros}>
          <View style={styles.filtro}>
            <Text>Edificio:</Text>
            <TouchableOpacity onPress={() => setSelectorEdificioVisible(true)} style={styles.selectInput}>
              <Text style={styles.selectInputText}>{edificioFiltro || 'Todos'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filtro}>
            <Text>Departamento:</Text>
            <TouchableOpacity onPress={() => setSelectorDepartamentoVisible(true)} style={styles.selectInput}>
              <Text style={styles.selectInputText}>{departamentoFiltro || 'Todos'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabla */}
        <DataTable style={styles.table}>
          <DataTable.Header>
            <DataTable.Title style={styles.modalTitle}>Edificio</DataTable.Title>
            <DataTable.Title style={styles.modalTitle}>Dep.</DataTable.Title>
            <DataTable.Title style={styles.modalTitle}>Estatus</DataTable.Title>
            <DataTable.Title style={styles.modalTitle}>Vigencia</DataTable.Title>
          </DataTable.Header>
          {pagosFiltrados.map((pago, idx) => (
            <DataTable.Row key={idx} onPress={() => abrirInfoUsuario(pago)}>
              <DataTable.Cell>{pago.edificio}</DataTable.Cell>
              <DataTable.Cell>{pago.departamento}</DataTable.Cell>
              <DataTable.Cell>
                <Text style={{ color: new Date() <= new Date(pago.vigencia) ? 'green' : 'red', fontWeight: 'bold' }}>
                  {new Date() <= new Date(pago.vigencia) ? 'Vigente' : 'No pagado'}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell>{new Date(pago.vigencia).toLocaleDateString()}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>

        {/* Modal Agregar */}
        <Portal>
          <PaperModal visible={modalAgregarVisible} onDismiss={() => setModalAgregarVisible(false)}>
            <View style={styles.modalView}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Agregar pago manual</Text>

              {/* Usuario selector */}
              <TouchableOpacity onPress={() => setSelectorUsuarioVisible(true)} style={[styles.selectInput, { width: 290, marginBottom: 8 }]}>
                <Text style={styles.selectInputText}>{datosPago.nombreUsuario || 'Selecciona un usuario...'}</Text>
              </TouchableOpacity>

              <TextInput label="Edificio" mode="outlined" value={datosPago.edificio} style={styles.input} editable={false} />
              <TextInput label="Departamento" mode="outlined" value={datosPago.departamento} style={styles.input} editable={false} />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '95%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, minWidth: 110 }}>Tipo de pago:</Text>
                <RadioButton.Group
                  onValueChange={(value) =>
                    setDatosPago((d) => ({
                      ...d,
                      tipoPago: value,
                      vigencia: calcularVigenciaExtendida(value, d.idUsuario, d.edificio, d.departamento),
                    }))
                  }
                  value={datosPago.tipoPago}
                >
                  <View style={{ alignItems: 'flex-start', width: '100%' }}>
                    <RadioButton.Item position="leading" color="#007bffff" label="Semanal" value="Semanal" />
                    <RadioButton.Item position="leading" color="#007bffff" label="Mensual" value="Mensual" />
                    <RadioButton.Item position="leading" color="#007bffff" label="Anual" value="Anual" />
                  </View>
                </RadioButton.Group>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '95%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, minWidth: 110 }}>Método de pago:</Text>
                <RadioButton.Group onValueChange={(value) => setDatosPago((d) => ({ ...d, metodoPago: value }))} value={datosPago.metodoPago}>
                  <View style={{ alignItems: 'flex-start', width: '100%' }}>
                    <RadioButton.Item position="leading" color="#007bffff" label="Manual" value="Manual" />
                    <RadioButton.Item position="leading" color="#007bffff" label="Transferencia" value="Transferencia" />
                  </View>
                </RadioButton.Group>
              </View>

              <TextInput label="Monto" mode="outlined" value={String(datosPago.monto || '')} onChangeText={(v) => setDatosPago((d) => ({ ...d, monto: v.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" style={styles.input} />
              <TextInput label="Vigencia" mode="outlined" value={datosPago.vigencia} style={styles.input} editable={false} />

              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                <Button icon="cancel" style={{ flex: 1, backgroundColor: '#d32f2f', marginRight: 8 }} mode="contained" onPress={() => setModalAgregarVisible(false)}>
                  Cancelar
                </Button>
                <Button style={{ flex: 1, backgroundColor: '#28aa0e', marginLeft: 8 }} mode="contained" icon="credit-card-plus" onPress={async () => {
                  const msg = validar(datosPago);
                  if (msg) { Alert.alert('Validación', msg); return; }
                  // Recalcular vigencia aquí para asegurar extensión desde la última vigente
                  const vigenciaFinal = calcularVigenciaExtendida(datosPago.tipoPago, datosPago.idUsuario, datosPago.edificio, datosPago.departamento);
                  const payload: Pago = {
                    ...datosPago,
                    monto: typeof datosPago.monto === 'string' ? parseFloat(datosPago.monto) : datosPago.monto,
                    fechaPago: new Date().toISOString(),
                    vigencia: vigenciaFinal,
                    estatus: 'vigente',
                    procesadoPor: idAdmin || datosPago.procesadoPor || '',
                    referenciaStripe: datosPago.referenciaStripe || '',
                  };
                  const exito = await agregarPago(payload);
                  if (exito) {
                    setModalAgregarVisible(false);
                    fetch(`${baseUrl}/verPagos`).then(res => res.json()).then(setPagos).catch(() => setPagos([]));
                  }
                }}>
                  Agregar
                </Button>
              </View>
            </View>
          </PaperModal>
        </Portal>

  {/* Modal información de usuario seleccionado (solo nombre, edificio y departamento) */}
        <Portal>
          <PaperModal visible={modalUsuarioInfoVisible} onDismiss={() => setModalUsuarioInfoVisible(false)}>
            <View style={styles.modalView}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Información del usuario</Text>
              {usuarioSeleccionado ? (
                <View style={{ width: '100%' }}>
      <Text style={styles.infoLine}><Text style={styles.infoLabel}>Nombre: </Text>{usuarioSeleccionado.NombreCompleto || '—'}</Text>
      <Text style={styles.infoLine}><Text style={styles.infoLabel}>Edificio: </Text>{usuarioSeleccionado.Edificio || (pagoSeleccionado?.edificio ?? '—')}</Text>
      <Text style={styles.infoLine}><Text style={styles.infoLabel}>Departamento: </Text>{usuarioSeleccionado.Departamento || (pagoSeleccionado?.departamento ?? '—')}</Text>
                </View>
              ) : (
                <Text>No se encontró información del usuario.</Text>
              )}
              <Button onPress={() => setModalUsuarioInfoVisible(false)} style={{ marginTop: 12 }}>Cerrar</Button>
            </View>
          </PaperModal>
        </Portal>

        {/* Selector Edificio filtro */}
        <Portal>
          <PaperModal visible={selectorEdificioVisible} onDismiss={() => setSelectorEdificioVisible(false)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Seleccionar edificio</Text>
              <FlatList style={{ width: '100%' }} data={["", ...edificios]} keyExtractor={(item, idx) => (item || 'Todos') + idx} renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setEdificioFiltro(item); setDepartamentoFiltro(''); setSelectorEdificioVisible(false); }} style={styles.selectorOpcion}>
                  <Text style={styles.selectorOpcionTexto}>{item || 'Todos'}</Text>
                </TouchableOpacity>
              )} />
              <Button onPress={() => setSelectorEdificioVisible(false)} style={{ marginTop: 8 }}>Cerrar</Button>
            </View>
          </PaperModal>
        </Portal>

        {/* Selector Departamento filtro */}
        <Portal>
          <PaperModal visible={selectorDepartamentoVisible} onDismiss={() => setSelectorDepartamentoVisible(false)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Seleccionar departamento</Text>
              <FlatList style={{ width: '100%' }} data={["", ...departamentos]} keyExtractor={(item, idx) => (item || 'Todos') + idx} renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setDepartamentoFiltro(item); setSelectorDepartamentoVisible(false); }} style={styles.selectorOpcion}>
                  <Text style={styles.selectorOpcionTexto}>{item || 'Todos'}</Text>
                </TouchableOpacity>
              )} />
              <Button onPress={() => setSelectorDepartamentoVisible(false)} style={{ marginTop: 8 }}>Cerrar</Button>
            </View>
          </PaperModal>
        </Portal>

        {/* Selector Usuario */}
        <Portal>
          <PaperModal visible={selectorUsuarioVisible} onDismiss={() => setSelectorUsuarioVisible(false)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Seleccionar usuario</Text>
      <FlatList style={{ width: '100%' }} data={usuarios} keyExtractor={(item) => normalizeId(item._id)} renderItem={({ item }) => (
                <TouchableOpacity onPress={() => {
                  setDatosPago((d) => ({
                    ...d,
        idUsuario: normalizeId(item._id),
                    nombreUsuario: item.NombreCompleto || '',
                    edificio: item.Edificio || '',
                    departamento: item.Departamento || '',
                  }));
                  setSelectorUsuarioVisible(false);
                }} style={styles.selectorOpcion}>
                  <Text style={styles.selectorOpcionTexto}>{item.NombreCompleto}</Text>
                </TouchableOpacity>
              )} />
              <Button onPress={() => setSelectorUsuarioVisible(false)} style={{ marginTop: 8 }}>Cerrar</Button>
            </View>
          </PaperModal>
        </Portal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, padding: 20 },
  table: { backgroundColor: '#fff', borderRadius: 8, padding: 8, marginTop: 10 },
  filtros: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  filtro: { flex: 1, marginHorizontal: 5, marginVertical: 5 },
  selectInput: { height: 40, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: '#fff' },
  selectInputText: { color: '#333', fontSize: 15 },
  modalView: { margin: 20, backgroundColor: 'white', borderRadius: 12, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, alignSelf: 'center', color: '#000000ff' },
  selectorOpcion: { width: '100%', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  selectorOpcionTexto: { fontSize: 16, color: '#222' },
  input: { width: 290, height: 36, borderRadius: 10, marginBottom: 5 },
  fab: { borderRadius: 30, position: 'absolute', margin: 16, right: 0, bottom: 2, backgroundColor: '#21f3f3ff', elevation: 8, zIndex: 999 },
  infoLine: { fontSize: 15, color: '#222', marginVertical: 2 },
  infoLabel: { fontWeight: 'bold', color: '#555' },
});