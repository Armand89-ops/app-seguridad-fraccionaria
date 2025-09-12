import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Button, DataTable, Dialog, FAB, Modal as PaperModal, Portal, RadioButton, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Anuncio = {
  _id?: string;
  id?: string;
  titulo: string;
  contenido: string;
  tipo: 'Edificio' | 'General' | string;
  nombreEdificio?: string;
  fechaEnvio?: string | null;
  programado: boolean;
  fechaProgramada?: string | null;
  idAdmin?: string;
};

export default function PantallaEnvioAnuncios() {
  const { idAdmin } = useLocalSearchParams<{ idAdmin?: string }>();

  const [edificios, setEdificios] = useState<string[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [detalleAnuncio, setDetalleAnuncio] = useState<Anuncio | null>(null);
  const [selectorEdificioVisible, setSelectorEdificioVisible] = useState(false);
   const insets = useSafeAreaInsets();

  const [DatosAnuncio, setDatosAnuncio] = useState<Anuncio>({
    titulo: '',
    contenido: '',
    tipo: '',
    nombreEdificio: '',
    fechaEnvio: '',
    programado: false,
    fechaProgramada: '',
    idAdmin: idAdmin || '',
  });
  const [editAnuncioId, setEditAnuncioId] = useState<string | null>(null);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [anuncioAEliminar, setAnuncioAEliminar] = useState<Anuncio | null>(null);
  // Confirmación para anuncios urgentes 3 días antes
  const [dialogUrgenteVisible, setDialogUrgenteVisible] = useState(false);
  const [payloadPendiente, setPayloadPendiente] = useState<Anuncio | null>(null);
  const [operacionPendiente, setOperacionPendiente] = useState<'agregar' | 'editar' | null>(null);

  const baseUrl = useMemo(() => 'http://192.168.0.103:3000', []);//ruta del backend

  useEffect(() => {
    fetchAnuncios();
  }, []);

  useEffect(() => {
    fetch(`${baseUrl}/verEdificios`)
      .then((res) => res.json())
      .then((data) => setEdificios(data))
      .catch(() => Alert.alert('Error', 'No se pudieron cargar los edificios'));
  }, [modalAgregarVisible, modalEditarVisible]);

  useEffect(() => {
    if (!editAnuncioId) return;
    const a = anuncios.find((x) => (x._id || x.id) === editAnuncioId);
    if (a) {
      setDatosAnuncio({
        titulo: a.titulo || '',
        contenido: a.contenido || '',
        tipo: (a.tipo as any) || '',
        nombreEdificio: a.tipo === 'Edificio' && a.nombreEdificio && edificios.includes(a.nombreEdificio) ? a.nombreEdificio : '',
        fechaEnvio: a.fechaEnvio || '',
        programado: !!a.programado,
        fechaProgramada: a.fechaProgramada || '',
        idAdmin: a.idAdmin || idAdmin || '',
      });
    }
  }, [editAnuncioId, edificios]);

  const fetchAnuncios = async () => {
    try {
      const res = await fetch(`${baseUrl}/verAnuncios`);
      const data = await res.json();
      setAnuncios(data);
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar los anuncios');
    }
  };

  // Validación
  const trim = (v?: string | null) => (v ?? '').trim();
  const validar = (d: Anuncio) => {
    if (!trim(d.titulo) || !trim(d.contenido) || !trim(d.tipo)) return { ok: false, msg: 'Completa título, contenido y tipo.' };
    if (d.tipo === 'Edificio' && !trim(d.nombreEdificio)) return { ok: false, msg: 'Selecciona el edificio.' };
    if (d.programado) {
      if (!trim(d.fechaProgramada)) return { ok: false, msg: 'Especifica la fecha programada (YYYY-MM-DD).' };
      const t = Date.parse(`${d.fechaProgramada}T09:00:00`);
      if (Number.isNaN(t)) return { ok: false, msg: 'Fecha programada inválida.' };
    }
    return { ok: true };
  };

  const esUrgente = (a: Anuncio) => {
    if (!a.programado || !a.fechaProgramada) return false;
    const ahora = Date.now();
    const fecha = Date.parse(a.fechaProgramada);
    if (Number.isNaN(fecha)) return false;
    const diffHoras = (fecha - ahora) / (1000 * 60 * 60);
    return diffHoras >= 0 && diffHoras <= 72; // dentro de las próximas 72 horas
  };

  const realizarAgregar = async (datosEnviar: Anuncio) => {
    try {
      const res = await fetch(`${baseUrl}/agregarAnuncio`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datosEnviar) });
      if (res.ok) {
        fetchAnuncios();
        setModalAgregarVisible(false);
        setDatosAnuncio({ titulo: '', contenido: '', tipo: '', nombreEdificio: '', fechaEnvio: '', programado: false, fechaProgramada: '', idAdmin: idAdmin || '' });
      } else { Alert.alert('Error', 'No se pudo agregar el anuncio'); }
    } catch { Alert.alert('Error', 'No se pudo agregar el anuncio'); }
  };

  // Agregar con verificación de urgencia
  const FuncionAgregarAnuncio = async () => {
    const datosEnviar: Anuncio = {
      ...DatosAnuncio,
      titulo: trim(DatosAnuncio.titulo),
      contenido: trim(DatosAnuncio.contenido),
      tipo: DatosAnuncio.tipo,
      nombreEdificio: DatosAnuncio.tipo === 'Edificio' ? trim(DatosAnuncio.nombreEdificio) : '',
      programado: !!DatosAnuncio.programado,
      fechaEnvio: DatosAnuncio.programado ? null : new Date().toISOString(),
      fechaProgramada: DatosAnuncio.programado && trim(DatosAnuncio.fechaProgramada) ? new Date(`${trim(DatosAnuncio.fechaProgramada)}T09:00:00`).toISOString() : null,
      idAdmin: idAdmin || DatosAnuncio.idAdmin || '',
    };
    const v = validar(datosEnviar);
    if (!v.ok) { Alert.alert('Validación', v.msg as any); return; }
    if (esUrgente(datosEnviar)) {
      setPayloadPendiente(datosEnviar); setOperacionPendiente('agregar'); setDialogUrgenteVisible(true); return;
    }
    realizarAgregar(datosEnviar);
  };

  // Editar
  const realizarEditar = async (datosEnviar: any) => {
    try {
      const res = await fetch(`${baseUrl}/editarAnuncio`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datosEnviar) });
      if (res.ok) {
        fetchAnuncios();
        setModalEditarVisible(false);
        setEditAnuncioId(null);
        setDatosAnuncio({ titulo: '', contenido: '', tipo: '', nombreEdificio: '', fechaEnvio: '', programado: false, fechaProgramada: '', idAdmin: idAdmin || '' });
      } else { Alert.alert('Error', 'No se pudo editar el anuncio'); }
    } catch { Alert.alert('Error', 'No se pudo editar el anuncio'); }
  };

  const FuncionEditarAnuncio = async () => {
    if (!editAnuncioId) { Alert.alert('Error', 'No se encontró anuncio a editar'); return; }
    const datosEnviar: any = {
      ...DatosAnuncio,
      id: editAnuncioId,
      titulo: trim(DatosAnuncio.titulo),
      contenido: trim(DatosAnuncio.contenido),
      tipo: DatosAnuncio.tipo,
      nombreEdificio: DatosAnuncio.tipo === 'Edificio' ? trim(DatosAnuncio.nombreEdificio) : '',
      fechaEnvio: DatosAnuncio.fechaEnvio ? new Date(DatosAnuncio.fechaEnvio).toISOString() : '',
      programado: !!DatosAnuncio.programado,
      fechaProgramada: DatosAnuncio.programado && trim(DatosAnuncio.fechaProgramada) ? new Date(`${trim(DatosAnuncio.fechaProgramada)}T09:00:00`).toISOString() : '',
      idAdmin: idAdmin || DatosAnuncio.idAdmin || '',
    };
    const v = validar(datosEnviar);
    if (!v.ok) { Alert.alert('Validación', v.msg as any); return; }
    if (esUrgente(datosEnviar)) {
      setPayloadPendiente(datosEnviar); setOperacionPendiente('editar'); setDialogUrgenteVisible(true); return;
    }
    realizarEditar(datosEnviar);
  };

  // Eliminar
  const FuncionEliminarAnuncio = async (id?: string) => {
    if (!id) return;
    try {
      const res = await fetch(`${baseUrl}/eliminarAnuncio`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      });
      if (res.ok) fetchAnuncios(); else Alert.alert('Error', 'No se pudo eliminar el anuncio');
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el anuncio');
    }
  };

  const AccionLadoDerecho = (anuncio: Anuncio) => (
    <TouchableOpacity style={[styles.action, styles.edit]} onPress={() => { setEditAnuncioId(anuncio._id || anuncio.id || null); setModalEditarVisible(true); }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name="edit-notifications" size={24} color="#fff" />
        <Text style={styles.text}>Editar</Text>
      </View>
    </TouchableOpacity>
  );

  const AccionLadoIzquierdo = (anuncio: Anuncio) => (
    <TouchableOpacity style={[styles.action, styles.delete]} onPress={() => { setAnuncioAEliminar(anuncio); setDialogVisible(true); }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name="notifications-off" size={24} color="#fff" />
        <Text style={styles.text}>Eliminar</Text>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Anuncio }) => (
    <Swipeable renderLeftActions={() => AccionLadoIzquierdo(item)} renderRightActions={() => AccionLadoDerecho(item)}>
      <TouchableOpacity style={styles.item} onPress={() => setDetalleAnuncio(item)}>
        <View style={styles.row}>
          <View style={styles.iconRight}>
            <MaterialIcons name="notifications-on" size={50} color="#3a3a3aff" />
          </View>
          <View style={{ flex: 0.9 }}>
            <Text style={styles.dataCellValue}>
              <Text style={styles.nombre}>Título:</Text> {item.titulo}{'   '}
              <Text style={styles.nombre}>Contenido:</Text> {item.contenido}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const formatearFecha = (fechaIso?: string | null) => {
    if (!fechaIso) return '';
    const fecha = new Date(fechaIso);
    let horas = fecha.getHours();
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    const ampm = horas >= 12 ? 'PM' : 'AM';
    horas = horas % 12; horas = horas ? horas : 12;
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `a las: ${horas}:${minutos} ${ampm} el ${dia}/${mes}/${anio}`;
  };

  return (
    <SafeAreaView style={styles.containerSafeArea}>
      <View style={styles.content}>
        <FAB size="large" icon="bell-plus" color="#000000ff" style={[styles.fab, { bottom: (insets.bottom || 0) + 18 }]} onPress={() => { setDatosAnuncio({ titulo: '', contenido: '', tipo: '', nombreEdificio: '', fechaEnvio: '', programado: false, fechaProgramada: '', idAdmin: idAdmin || '' }); setModalAgregarVisible(true); }} />

        <FlatList data={anuncios} keyExtractor={(item) => item.id?.toString() || item._id?.toString() || Math.random().toString()} renderItem={renderItem} />

        {/* Modal Detalles */}
        <Portal>
          <PaperModal visible={!!detalleAnuncio} onDismiss={() => setDetalleAnuncio(null)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Detalles del anuncio</Text>
              <DataTable style={styles.dataTable}>
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell><Text style={styles.dataCellTitle}>Título: </Text><Text style={styles.dataCellValue}>{detalleAnuncio?.titulo}</Text></DataTable.Cell>
                </DataTable.Row>
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell><Text style={styles.dataCellTitle}>Contenido: </Text><Text style={styles.dataCellValue}>{detalleAnuncio?.contenido}</Text></DataTable.Cell>
                </DataTable.Row>
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell><Text style={styles.dataCellTitle}>Tipo: </Text><Text style={styles.dataCellValue}>{detalleAnuncio?.tipo}</Text></DataTable.Cell>
                </DataTable.Row>
                {detalleAnuncio?.tipo === 'Edificio' ? (
                  <DataTable.Row style={styles.dataRow}>
                    <DataTable.Cell><Text style={styles.dataCellTitle}>Edificio: </Text><Text style={styles.dataCellValue}>{detalleAnuncio?.nombreEdificio}</Text></DataTable.Cell>
                  </DataTable.Row>
                ) : null}
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell><Text style={styles.dataCellTitle}>Fecha envío: </Text><Text style={styles.dataCellValue}>{formatearFecha(detalleAnuncio?.fechaEnvio)}</Text></DataTable.Cell>
                </DataTable.Row>
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell><Text style={styles.dataCellTitle}>Programado: </Text><Text style={styles.dataCellValue}>{detalleAnuncio?.programado ? 'Sí' : 'No'}</Text></DataTable.Cell>
                </DataTable.Row>
                {detalleAnuncio?.programado ? (
                  <DataTable.Row style={styles.dataRow}>
                    <DataTable.Cell><Text style={styles.dataCellTitle}>Fecha programada: </Text><Text style={styles.dataCellValue}>{detalleAnuncio?.fechaProgramada}</Text></DataTable.Cell>
                  </DataTable.Row>
                ) : null}
              </DataTable>
              <Button style={{ backgroundColor: '#2732f1ff' }} icon="keyboard-backspace" mode="contained" onPress={() => setDetalleAnuncio(null)}>Regresar</Button>
            </View>
          </PaperModal>
        </Portal>

        {/* Modal Agregar */}
        <Portal>
          <PaperModal visible={modalAgregarVisible} onDismiss={() => setModalAgregarVisible(false)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Agregar anuncio</Text>
              <TextInput mode="outlined" label="Título" value={DatosAnuncio.titulo} onChangeText={(v) => setDatosAnuncio({ ...DatosAnuncio, titulo: v })} style={styles.input} />
              <TextInput mode="outlined" label="Contenido" value={DatosAnuncio.contenido} onChangeText={(v) => setDatosAnuncio({ ...DatosAnuncio, contenido: v })} style={styles.input} />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '95%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, minWidth: 110 }}>Tipo anuncio:</Text>
                <RadioButton.Group onValueChange={(value) => setDatosAnuncio({ ...DatosAnuncio, tipo: value })} value={DatosAnuncio.tipo}>
                  <View style={{ alignItems: 'flex-start', width: '100%' }}>
                    <RadioButton.Item position="leading" color="#007bffff" label="Edificio" value="Edificio" />
                    <RadioButton.Item position="leading" color="#007bffff" label="General" value="General" />
                  </View>
                </RadioButton.Group>
              </View>

              {DatosAnuncio.tipo === 'Edificio' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '80%' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, marginRight: 8 }}>Edificio:</Text>
                  <TouchableOpacity onPress={() => setSelectorEdificioVisible(true)} style={styles.selectInput}>
                    <Text style={styles.selectInputText}>{DatosAnuncio.nombreEdificio || 'Seleccionar...'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '95%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, minWidth: 110 }}>¿Cuándo enviar?:</Text>
                <RadioButton.Group onValueChange={(value) => setDatosAnuncio({ ...DatosAnuncio, programado: value === 'Programada' })} value={DatosAnuncio.programado ? 'Programada' : 'Inmediata'}>
                  <View style={{ alignItems: 'flex-start', width: '100%' }}>
                    <RadioButton.Item position="leading" color="#007bffff" label="Inmediata" value="Inmediata" />
                    <RadioButton.Item position="leading" color="#007bffff" label="Programada" value="Programada" />
                  </View>
                </RadioButton.Group>
              </View>

              {DatosAnuncio.programado && (
                <TextInput mode="outlined" placeholder="Fecha programada (YYYY-MM-DD)" value={DatosAnuncio.fechaProgramada || ''} onChangeText={(v) => setDatosAnuncio({ ...DatosAnuncio, fechaProgramada: v })} style={styles.input} />
              )}

              <View style={styles.modalBtns}>
                <Button style={[styles.cancelar, { flex: 1, marginRight: 8 }]} icon="cancel" mode="elevated" onPress={() => setModalAgregarVisible(false)} labelStyle={{ color: '#fff' }}>Cancelar</Button>
                <Button style={[styles.agregar, { flex: 1, marginLeft: 8 }]} icon="bell-plus" mode="elevated" onPress={FuncionAgregarAnuncio} labelStyle={{ color: '#fff' }}>Agregar</Button>
              </View>
            </View>
          </PaperModal>
        </Portal>

        {/* Modal Editar */}
        <Portal>
          <PaperModal visible={modalEditarVisible} onDismiss={() => setModalEditarVisible(false)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Editar anuncio</Text>
              <TextInput mode="outlined" label="Título" value={DatosAnuncio.titulo} onChangeText={(v) => setDatosAnuncio({ ...DatosAnuncio, titulo: v })} style={styles.input} />
              <TextInput mode="outlined" label="Contenido" value={DatosAnuncio.contenido} onChangeText={(v) => setDatosAnuncio({ ...DatosAnuncio, contenido: v })} style={styles.input} />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '95%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, minWidth: 110 }}>Tipo anuncio:</Text>
                <RadioButton.Group onValueChange={(value) => setDatosAnuncio({ ...DatosAnuncio, tipo: value })} value={DatosAnuncio.tipo}>
                  <View style={{ alignItems: 'flex-start', width: '100%' }}>
                    <RadioButton.Item position="leading" color="#007bffff" label="Edificio" value="Edificio" />
                    <RadioButton.Item position="leading" color="#007bffff" label="General" value="General" />
                  </View>
                </RadioButton.Group>
              </View>

              {DatosAnuncio.tipo === 'Edificio' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '80%' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, marginRight: 8 }}>Edificio:</Text>
                  <TouchableOpacity onPress={() => setSelectorEdificioVisible(true)} style={styles.selectInput}>
                    <Text style={styles.selectInputText}>{DatosAnuncio.nombreEdificio || 'Seleccionar...'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '95%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, minWidth: 110 }}>¿Cuándo enviar?:</Text>
                <RadioButton.Group onValueChange={(value) => setDatosAnuncio({ ...DatosAnuncio, programado: value === 'Programada' })} value={DatosAnuncio.programado ? 'Programada' : 'Inmediata'}>
                  <View style={{ alignItems: 'flex-start', width: '100%' }}>
                    <RadioButton.Item position="leading" color="#007bffff" label="Inmediata" value="Inmediata" />
                    <RadioButton.Item position="leading" color="#007bffff" label="Programada" value="Programada" />
                  </View>
                </RadioButton.Group>
              </View>

              {DatosAnuncio.programado && (
                <TextInput mode="outlined" label="Fecha programada (YYYY-MM-DD)" value={DatosAnuncio.fechaProgramada || ''} onChangeText={(v) => setDatosAnuncio({ ...DatosAnuncio, fechaProgramada: v })} style={styles.input} />
              )}

              <View style={styles.modalBtns}>
                <Button style={[styles.cancelar, { flex: 1, marginRight: 8 }]} icon="cancel" mode="elevated" onPress={() => { setModalEditarVisible(false); setEditAnuncioId(null); setDatosAnuncio({ titulo: '', contenido: '', tipo: '', nombreEdificio: '', fechaEnvio: '', programado: false, fechaProgramada: '', idAdmin: idAdmin || '' }); }} labelStyle={{ color: '#fff' }}>Cancelar</Button>
                <Button style={[styles.agregar, { flex: 1, marginLeft: 8 }]} icon="bell-plus" mode="elevated" onPress={FuncionEditarAnuncio} labelStyle={{ color: '#fff' }}>Guardar</Button>
              </View>
            </View>
          </PaperModal>
        </Portal>

        {/* Dialog Eliminar */}
        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
            <Dialog.Title>Confirmar eliminación</Dialog.Title>
            <Dialog.Content>
              <Text>¿Estás seguro de que deseas eliminar este anuncio?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogVisible(false)} labelStyle={{ color: '#1976d2' }} icon="close">Cancelar</Button>
              <Button onPress={() => { setDialogVisible(false); FuncionEliminarAnuncio((anuncioAEliminar?._id || (anuncioAEliminar as any)?.id) as string); }} labelStyle={{ color: '#d32f2f' }} icon="delete">Eliminar</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Dialogo Urgente (< 3 días) */}
        <Portal>
          <Dialog visible={dialogUrgenteVisible} onDismiss={() => { setDialogUrgenteVisible(false); setPayloadPendiente(null); setOperacionPendiente(null); }}>
            <Dialog.Title>Confirmar anuncio urgente</Dialog.Title>
            <Dialog.Content>
              <Text>Este anuncio programado está dentro de los próximos 3 días. ¿Deseas aprobar su envío?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => { setDialogUrgenteVisible(false); setPayloadPendiente(null); setOperacionPendiente(null); }} labelStyle={{ color: '#1976d2' }} icon="close">Cancelar</Button>
              <Button onPress={() => {
                if (payloadPendiente && operacionPendiente === 'agregar') realizarAgregar(payloadPendiente);
                if (payloadPendiente && operacionPendiente === 'editar') realizarEditar(payloadPendiente);
                setDialogUrgenteVisible(false); setPayloadPendiente(null); setOperacionPendiente(null);
              }} labelStyle={{ color: '#0d6b2f' }} icon="check-circle">Aprobar</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Selector de Edificio */}
        <Portal>
          <PaperModal visible={selectorEdificioVisible} onDismiss={() => setSelectorEdificioVisible(false)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Seleccionar edificio</Text>
              <FlatList style={{ width: '100%' }} data={edificios} keyExtractor={(item, idx) => item + idx} renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setDatosAnuncio((prev) => ({ ...prev, nombreEdificio: item })); setSelectorEdificioVisible(false); }} style={styles.selectorOpcion}>
                  <Text style={styles.selectorOpcionTexto}>{item}</Text>
                </TouchableOpacity>
              )} />
              <Button onPress={() => setSelectorEdificioVisible(false)} style={{ marginTop: 8 }}>Cerrar</Button>
            </View>
          </PaperModal>
        </Portal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10 },
  headerText: { fontWeight: 'bold', width: '33%' },
  nombre: { fontWeight: 'bold', fontSize: 15 },
  item: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 14, elevation: 3, borderWidth: 1, borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  delete: { backgroundColor: '#d32f2f' },
  edit: { backgroundColor: '#1976d2' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  iconRight: { justifyContent: 'center', alignItems: 'center', width: 90, height: 80, marginRight: 16, backgroundColor: '#ffffffff', borderRadius: 8 },
  fab: { borderRadius: 30, position: 'absolute', margin: 16, right: 0, bottom: 2, backgroundColor: '#21f3f3ff', elevation: 8, zIndex: 999 },
  dataTable: { borderRadius: 10, overflow: 'hidden', marginVertical: 20, backgroundColor: '#f7fafd', elevation: 4 },
  dataRow: { borderBottomWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff' },
  dataCellTitle: { fontWeight: 'bold', color: '#000000ff', fontSize: 15 },
  dataCellValue: { color: '#333', fontSize: 15, textAlign: 'left', fontStyle: 'italic' },
  cancelar: { backgroundColor: '#f20000ff' },
  agregar: { backgroundColor: '#28aa0eff' },
  containerSafeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, padding: 20 },
  text: { color: '#fff', fontSize: 12 },
  action: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 10, margin: 14, minWidth: 30, justifyContent: 'center' },
  selectInput: { flex: 1, height: 40, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: '#fff' },
  selectInputText: { color: '#333', fontSize: 15 },
  selectorOpcion: { width: '100%', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  selectorOpcionTexto: { fontSize: 16, color: '#222' },
  modalView: { margin: 20, backgroundColor: 'white', borderRadius: 10, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, alignSelf: 'center' },
  input: { width: 290, height: 40, borderRadius: 10, marginBottom: 8 },
  modalBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 8 },
});
