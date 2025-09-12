import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, Platform, TextInput as RNTextInput, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Button, DataTable, Dialog, FAB, Modal as PaperModal, Portal, RadioButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import { getAdminId } from '../../lib/session';

type Chat = {
  _id?: string;
  tipo: 'general' | 'edificio' | 'privado' | string;
  nombreEdificio?: string;
  usuarios?: string[];
  fechaCreacion?: string;
};

type Mensaje = { _id?: string; idChat: string; idUsuario: string; contenido: string; fechaEnvio: string };

export default function PantallaMonitoreoChats() {
  const { idAdmin: idAdminParam } = useLocalSearchParams<{ idAdmin?: string }>();
  const idAdmin = useMemo(() => idAdminParam || getAdminId() || '', [idAdminParam]);
  const baseUrl = useMemo(() => 'http://192.168.0.103:3000', []);//ruta del backend

  const [chats, setChats] = useState<Chat[]>([]);
  const [modalVerVisible, setModalVerVisible] = useState(false);
  const [dialogEliminarVisible, setDialogEliminarVisible] = useState(false);
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [chatSeleccionado, setChatSeleccionado] = useState<Chat | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  //  estado para el modal de detalles
  const [chatDetalles, setChatDetalles] = useState<Chat | null>(null);
  const socketRef = useRef<any>(null);
  const [tipoChat, setTipoChat] = useState<'general' | 'edificio' | 'privado'>('general');
  const [edificios, setEdificios] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<{ _id: string; nombre: string }[]>([]);
  const [nombreEdificio, setNombreEdificio] = useState('');
  const [usuariosPrivado, setUsuariosPrivado] = useState<{ usuario1: string; usuario2: string }>({ usuario1: '', usuario2: '' });
  const [mensajeNuevo, setMensajeNuevo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputBarHeight = 66; // altura aproximada barra de envío
  const extraOffset = 2; //  espacio extra sobre teclado

  const [selectorTipoVisible, setSelectorTipoVisible] = useState(false);
  const [selectorEdificioVisible, setSelectorEdificioVisible] = useState(false);
  const [selectorUsuario1Visible, setSelectorUsuario1Visible] = useState(false);
  const [selectorUsuario2Visible, setSelectorUsuario2Visible] = useState(false);

  // carga chats y usuarios, conecta socket
  useEffect(() => {
    fetch(`${baseUrl}/verChats`).then(res => res.json()).then(setChats).catch(() => Alert.alert('Error', 'No se pudieron cargar los chats'));
    fetch(`${baseUrl}/nombresUsuario`).then(res => res.json()).then(setUsuarios).catch(() => setUsuarios([]));
    // Conectar socket
    const s = io(baseUrl);
    socketRef.current = s;
    // Actualizar lista de chats en tiempo real
    s.on('chat:creado', (chat: Chat) => setChats((prev) => [chat, ...prev]));
    s.on('chat:eliminado', ({ idChat }: { idChat: string }) => {
      setChats((prev) => prev.filter((c) => c._id !== idChat));
      if (chatSeleccionado?._id === idChat) {
        setChatSeleccionado(null);
        setMensajes([]);
      }
    });
    return () => { s.disconnect(); };
  }, []);

  // carga edificios cuando se necesita
  useEffect(() => {
    if ((modalAgregarVisible && tipoChat === 'edificio') || selectorEdificioVisible) {
      fetch(`${baseUrl}/verEdificios`).then(res => res.json()).then(setEdificios).catch(() => Alert.alert('Error', 'No se pudieron cargar los edificios'));
    }
  }, [modalAgregarVisible, tipoChat, selectorEdificioVisible]);

  // Normaliza posibles formatos de ObjectId a string
  const normalizeId = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (typeof val.$oid === 'string') return val.$oid; // formato Mongo JSON
      if (typeof val.toHexString === 'function') return val.toHexString();
      if (typeof val._id === 'string') return val._id;
    }
    return String(val);
  };

  const usuariosMap = useMemo(() => {
    const m = new Map<string, string>();
    usuarios.forEach((u) => m.set(normalizeId(u._id), u.nombre));
    return m;
  }, [usuarios]);

  const obtenerNombresUsuarios = (ids?: any[]) => {
    if (!Array.isArray(ids)) return '';
    return ids
      .map((raw) => {
        const id = normalizeId(raw);
        return usuariosMap.get(id) || id;
      })
      .join(', ');
  };

  const obtenerNombrePorId = (raw?: any) => {
    const id = normalizeId(raw);
    return usuariosMap.get(id) || id || '';
  };

  const agregarChat = async () => {
    const body: any = { tipo: tipoChat, idAdmin };
    if (tipoChat === 'edificio') {
      if (!nombreEdificio) { Alert.alert('Error', 'Selecciona un edificio'); return; }
      body.nombreEdificio = nombreEdificio;
    }
    if (tipoChat === 'privado') {
      if (!usuariosPrivado.usuario1 || !usuariosPrivado.usuario2 || usuariosPrivado.usuario1 === usuariosPrivado.usuario2) {
        Alert.alert('Error', 'Selecciona dos usuarios diferentes');
        return;
      }
      body.usuarios = [usuariosPrivado.usuario1, usuariosPrivado.usuario2];
    }
    try {
      const res = await fetch(`${baseUrl}/crearChat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setModalAgregarVisible(false);
        setTipoChat('general'); setNombreEdificio(''); setUsuariosPrivado({ usuario1: '', usuario2: '' });
        const lista = await fetch(`${baseUrl}/verChats`).then((r) => r.json());
        setChats(lista);
        Alert.alert('Éxito', 'Chat creado');
      } else { Alert.alert('Error', 'No se pudo crear el chat'); }
    } catch { Alert.alert('Error', 'No se pudo crear el chat'); }
  };

  const verMensajes = async (idChat?: string, chatObj?: Chat) => {
    if (!idChat) return;
    try {
      if (chatObj) setChatSeleccionado(chatObj);
      const data = await fetch(`${baseUrl}/verMensajes/${idChat}`).then((r) => r.json());
      const ordenados = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(a.fechaEnvio).getTime() - new Date(b.fechaEnvio).getTime())
        : [];
      setMensajes(ordenados);
      // No modal: la selección del chat dispara vista completa
    } catch { Alert.alert('Error', 'No se pudieron cargar los mensajes'); }
  };

  const eliminarChat = async (id?: string) => {
    if (!id) return;
    try {
      await fetch(`${baseUrl}/eliminarChat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setDialogEliminarVisible(false);
      setChatSeleccionado(null);
      const lista = await fetch(`${baseUrl}/verChats`).then((r) => r.json());
      setChats(lista);
      Alert.alert('Éxito', 'Chat eliminado');
    } catch { Alert.alert('Error', 'No se pudo eliminar el chat'); }
  };

  // Helpers UI mensajes 
  const listaMensajesRef = useRef<FlatList<Mensaje>>(null);
  const esMio = (rawId?: any) => normalizeId(rawId) === normalizeId(idAdmin);
  const formatHora = (fecha: string) => new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    const idChat = chatSeleccionado?._id;
    if (idChat) {
      socketRef.current?.emit('join-chat', idChat);
      const handler = (msg: Mensaje) => {
        if (msg.idChat === idChat) {
          setMensajes((prev) => (prev.some((m) => m._id && msg._id && m._id === msg._id) ? prev : [...prev, msg]));
        }
      };
      socketRef.current?.off('mensaje:nuevo');
      socketRef.current?.on('mensaje:nuevo', handler);
      return () => {
        socketRef.current?.off('mensaje:nuevo', handler as any);
        socketRef.current?.emit('leave-chat', idChat);
      };
    }
  }, [chatSeleccionado?._id]);

  // Listeners teclado para barra flotante dentro del modal
  useEffect(() => {
    if (!chatSeleccionado?._id) return; // sólo cuando un chat está abierto
    const showEvt = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvt = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';
    const onShow = (e: any) => setKeyboardHeight(e?.endCoordinates?.height || 0);
    const onHide = () => setKeyboardHeight(0);
    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => { s1.remove(); s2.remove(); };
  }, [chatSeleccionado?._id]);

  const enviarMensaje = async () => {
    if (enviando) return;
    const txt = (mensajeNuevo || '').trim();
    if (!txt || !chatSeleccionado?._id) return;
    setEnviando(true);
    const backup = txt;
    setMensajeNuevo('');
    try {
      await fetch(`${baseUrl}/agregarMensaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idChat: chatSeleccionado._id, contenido: txt, idUsuario: idAdmin })
      });
      // El mensaje llegará por socket (mensaje:nuevo). No insertamos local para evitar duplicados.
    } catch (error: any) {
      setMensajeNuevo(backup); // restaurar si fallo
      Alert.alert('Error', 'No se pudo enviar el mensaje: ' + (error?.message || '')); 
    } finally {
      setEnviando(false);
    }
  };

  const AccionLadoIzquierdo = (item: Chat) => (
    <TouchableOpacity style={[styles.action, styles.delete]} onPress={() => { setChatSeleccionado(item); setDialogEliminarVisible(true); }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name="delete" size={24} color="#fff" />
        <Text style={styles.text}>Eliminar</Text>
      </View>
    </TouchableOpacity>
  );

  const AccionLadoDerecho = (item: Chat) => {
    if (item.tipo === 'privado') return null;
    return (
      <TouchableOpacity style={[styles.action, styles.ver]} onPress={() => verMensajes(item._id, item)}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="chat" size={24} color="#fff" />
          <Text style={styles.text}>Ver mensajes</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: Chat }) => (
    <Swipeable renderLeftActions={() => AccionLadoIzquierdo(item)} renderRightActions={() => AccionLadoDerecho(item)}>
      <TouchableOpacity
        style={styles.item}
        onPress={() => { setChatDetalles(item); setModalVerVisible(true); }}
      >
        <Text style={styles.nombre}>
          {item.tipo === 'general'
            ? 'Chat General'
            : item.tipo === 'edificio'
            ? `Chat Edificio: ${item.nombreEdificio}`
            : `Chat Privado (${obtenerNombresUsuarios(item.usuarios)})`}
        </Text>
        <Text style={styles.tipo}>Tipo: {item.tipo}</Text>
        <Text style={styles.fecha}>Creado: {item.fechaCreacion ? new Date(item.fechaCreacion).toLocaleString() : ''}</Text>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.containerSafeArea} edges={chatSeleccionado ? ['left','right','bottom'] : undefined}>
      {chatSeleccionado ? (
        <View style={styles.chatFullScreen}>
          {/* Header chat */}
          <View style={styles.chatHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => { setChatSeleccionado(null); setMensajes([]); setKeyboardHeight(0); }}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.chatHeaderTitle} numberOfLines={1}>
              {chatSeleccionado.tipo === 'general'
                ? 'Chat General'
                : chatSeleccionado.tipo === 'edificio'
                ? `Chat Edificio: ${chatSeleccionado.nombreEdificio}`
                : chatSeleccionado.tipo === 'privado'
                ? 'Chat Privado'
                : 'Chat'}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          {/* Lista de mensajes */}
          <FlatList
            ref={listaMensajesRef}
            style={[styles.chatList, keyboardHeight ? { marginBottom: keyboardHeight } : null]}
            contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 2, paddingBottom: 12 + inputBarHeight + extraOffset }}
            data={mensajes}
            keyExtractor={(i) => i._id || Math.random().toString()}
            onContentSizeChange={() => listaMensajesRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => listaMensajesRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const mio = esMio(item.idUsuario);
              const nombre = mio ? 'Yo' : (obtenerNombrePorId(item.idUsuario) || 'Usuario');
              return (
                <View style={[styles.bubbleRow, mio ? styles.alignEnd : styles.alignStart]}>
                  <View style={[styles.bubble, mio ? styles.bubbleMine : styles.bubbleOther]}>
                    <Text style={[styles.senderName, mio && { color: '#0d6b2f' }]}>{nombre}</Text>
                    <Text style={styles.msgText}>{item.contenido}</Text>
                    <Text style={styles.timeText}>{formatHora(item.fechaEnvio)}</Text>
                  </View>
                </View>
              );
            }}
          />
          {/* Composer flotante */}
          <View style={[styles.composerFloating, { bottom: keyboardHeight + extraOffset }]}>
            <RNTextInput
              style={styles.composerInput}
              placeholder="Mensaje"
              value={mensajeNuevo}
              onChangeText={setMensajeNuevo}
              multiline
              onSubmitEditing={enviarMensaje}
            />
            <Button
              mode="contained"
              style={styles.composerSendBtn}
              icon={enviando ? undefined : 'send'}
              loading={enviando}
              disabled={enviando || !mensajeNuevo.trim()}
              onPress={enviarMensaje}
              labelStyle={{ color: '#fff' }}
              contentStyle={{ height: 44, paddingHorizontal: 12 }}
            >
              {enviando ? 'Enviando' : 'Enviar'}
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <FlatList data={chats} renderItem={renderItem} keyExtractor={(i) => i._id || Math.random().toString()} style={{ width: '100%' }} />
          <FAB size='large' icon="chat-plus" color="#000000ff" style={styles.fab} onPress={() => setModalAgregarVisible(true)} />
        </View>
      )}

      {/* Modal Agregar Chat  */}
      <Portal>
        <PaperModal visible={modalAgregarVisible} onDismiss={() => setModalAgregarVisible(false)}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Agregar nuevo chat</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '90%' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 15, marginRight: 8, minWidth: 110 }}>Tipo de chat:</Text>
              <RadioButton.Group onValueChange={(value) => setTipoChat(value as any)} value={tipoChat}>
                <View style={{ alignItems: 'flex-start', width: '100%' }}>
                  <RadioButton.Item position="leading" color="#007bffff" label="General" value="general" />
                  <RadioButton.Item position="leading" color="#007bffff" label="Edificio" value="edificio" />
                  <RadioButton.Item position="leading" color="#007bffff" label="Privado" value="privado" />
                </View>
              </RadioButton.Group>
            </View>

            {tipoChat === 'edificio' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '90%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, marginRight: 8, minWidth: 110 }}>Edificio:</Text>
                <TouchableOpacity onPress={() => { setModalAgregarVisible(false); setSelectorEdificioVisible(true); }} style={[styles.selectInput, { flex: 1 }]}> 
                  <Text style={styles.selectInputText}>{nombreEdificio || 'Selecciona un edificio...'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {tipoChat === 'privado' && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '90%' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, marginRight: 8, minWidth: 110 }}>Usuario 1:</Text>
                  <TouchableOpacity onPress={() => { setModalAgregarVisible(false); setSelectorUsuario1Visible(true); }} style={[styles.selectInput, { flex: 1 }]}> 
                    <Text style={styles.selectInputText}>{obtenerNombrePorId(usuariosPrivado.usuario1) || 'Selecciona usuario...'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '90%' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, marginRight: 8, minWidth: 110 }}>Usuario 2:</Text>
                  <TouchableOpacity onPress={() => { setModalAgregarVisible(false); setSelectorUsuario2Visible(true); }} style={[styles.selectInput, { flex: 1 }]}> 
                    <Text style={styles.selectInputText}>{obtenerNombrePorId(usuariosPrivado.usuario2) || 'Selecciona usuario...'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelar} onPress={() => setModalAgregarVisible(false)}>
                <Text style={{ color: '#fff', textAlign: 'center', padding: 10 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.agregar} onPress={agregarChat}>
                <Text style={{ color: '#fff', textAlign: 'center', padding: 10 }}>Crear chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </PaperModal>
      </Portal>

      {/* Selector de Edificio */}
      <Portal>
        <PaperModal visible={selectorEdificioVisible} onDismiss={() => setSelectorEdificioVisible(false)}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Seleccionar edificio</Text>
            <FlatList style={{ width: '100%' }} data={edificios} keyExtractor={(item, idx) => item + idx} renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { setNombreEdificio(item); setSelectorEdificioVisible(false); setModalAgregarVisible(true); }} style={styles.selectorOpcion}>
                <Text style={styles.selectorOpcionTexto}>{item}</Text>
              </TouchableOpacity>
            )} />
            <Button onPress={() => { setSelectorEdificioVisible(false); setModalAgregarVisible(true); }} style={{ marginTop: 8 }}>Cerrar</Button>
          </View>
        </PaperModal>
      </Portal>

      {/* Selector Usuario 1 */}
      <Portal>
        <PaperModal visible={selectorUsuario1Visible} onDismiss={() => setSelectorUsuario1Visible(false)}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Seleccionar usuario 1</Text>
            <FlatList style={{ width: '100%' }} data={usuarios} keyExtractor={(item) => item._id} renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { setUsuariosPrivado((u) => ({ ...u, usuario1: item._id })); setSelectorUsuario1Visible(false); setModalAgregarVisible(true); }} style={styles.selectorOpcion}>
                <Text style={styles.selectorOpcionTexto}>{item.nombre}</Text>
              </TouchableOpacity>
            )} />
            <Button onPress={() => { setSelectorUsuario1Visible(false); setModalAgregarVisible(true); }} style={{ marginTop: 8 }}>Cerrar</Button>
          </View>
        </PaperModal>
      </Portal>

      {/* Selector Usuario 2 */}
      <Portal>
        <PaperModal visible={selectorUsuario2Visible} onDismiss={() => setSelectorUsuario2Visible(false)}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Seleccionar usuario 2</Text>
            <FlatList style={{ width: '100%' }} data={usuarios} keyExtractor={(item) => item._id} renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { setUsuariosPrivado((u) => ({ ...u, usuario2: item._id })); setSelectorUsuario2Visible(false); setModalAgregarVisible(true); }} style={styles.selectorOpcion}>
                <Text style={styles.selectorOpcionTexto}>{item.nombre}</Text>
              </TouchableOpacity>
            )} />
            <Button onPress={() => { setSelectorUsuario2Visible(false); setModalAgregarVisible(true); }} style={{ marginTop: 8 }}>Cerrar</Button>
          </View>
        </PaperModal>
      </Portal>

      {/* Modal Ver detalles del chat */}
      <Portal>
        <PaperModal
          visible={modalVerVisible}
          onDismiss={() => { setModalVerVisible(false); setChatDetalles(null); }}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Detalles del chat</Text>
            <DataTable style={styles.dataTable}>
              <DataTable.Row style={styles.dataRow}>
                <DataTable.Cell><Text style={styles.dataCellTitle}>Tipo:</Text></DataTable.Cell>
                <DataTable.Cell><Text style={styles.dataCellValue}>{chatDetalles?.tipo}</Text></DataTable.Cell>
              </DataTable.Row>
              {chatDetalles?.tipo === 'edificio' && (
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell><Text style={styles.dataCellTitle}>Edificio:</Text></DataTable.Cell>
                  <DataTable.Cell><Text style={styles.dataCellValue}>{chatDetalles?.nombreEdificio}</Text></DataTable.Cell>
                </DataTable.Row>
              )}
              <DataTable.Row style={styles.dataRow}>
                <DataTable.Cell><Text style={styles.dataCellTitle}>Usuarios:</Text></DataTable.Cell>
                <DataTable.Cell>
                  <Text style={styles.dataCellValue} numberOfLines={3}>
                    {obtenerNombresUsuarios(chatDetalles?.usuarios)}
                  </Text>
                </DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row style={styles.dataRow}>
                <DataTable.Cell><Text style={styles.dataCellTitle}>Fecha creación:</Text></DataTable.Cell>
                <DataTable.Cell>
                  <Text style={styles.dataCellValue}>
                    {chatDetalles?.fechaCreacion ? new Date(chatDetalles.fechaCreacion).toLocaleString() : ''}
                  </Text>
                </DataTable.Cell>
              </DataTable.Row>
            </DataTable>
            <Button
              style={{ backgroundColor: '#2732f1ff', marginTop: 16 }}
              icon="keyboard-backspace"
              mode="contained"
              onPress={() => { setModalVerVisible(false); setChatDetalles(null); }}
              labelStyle={{ color: '#fff' }}
            >
              Regresar
            </Button>
          </View>
        </PaperModal>
      </Portal>


      {/* Confirmación eliminar */}
      <Portal>
        <Dialog visible={dialogEliminarVisible} onDismiss={() => setDialogEliminarVisible(false)}>
          <Dialog.Title>Eliminar chat</Dialog.Title>
          <Dialog.Content><Text>¿Estás seguro de que deseas eliminar este chat?</Text></Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogEliminarVisible(false)} labelStyle={{ color: '#1976d2' }} icon="close">Cancelar</Button>
            <Button onPress={() => eliminarChat(chatSeleccionado?._id)} labelStyle={{ color: '#d32f2f' }} icon="delete">Eliminar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  containerSafeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1, padding: 20 },
  item: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 10, elevation: 2 },
  nombre: { fontWeight: 'bold', fontSize: 16 },
  tipo: { color: '#555', marginTop: 2 },
  fecha: { color: '#888', fontSize: 12, marginTop: 2 },
  modalView: { margin: 20, backgroundColor: 'white', borderRadius: 10, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  mensajeItem: { marginBottom: 10, backgroundColor: '#f0f0f0', borderRadius: 6, padding: 8 },
  mensajeUsuario: { fontWeight: 'bold' },
  mensajeContenido: { marginLeft: 8 },
  mensajeFecha: { fontSize: 10, color: '#888', marginLeft: 8 },
  fab: { borderRadius: 30, position: 'absolute', bottom: 16, right: 16, backgroundColor: '#21f3f3ff' },
  input: { borderColor: '#ccc', borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 10, textAlignVertical: 'top', fontSize: 16, backgroundColor: '#f7fafd', width: '100%', minHeight: 40, maxHeight: 100 },
  action: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, margin: 5, minWidth: 80, justifyContent: 'center' },
  ver: { backgroundColor: '#1976d2' },
  delete: { backgroundColor: '#F44336' },
  text: { color: 'white', marginLeft: 6, fontWeight: 'bold' },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  cancelar: { backgroundColor: '#f20000ff', flex: 1, marginRight: 8, borderRadius: 8 },
  agregar: { backgroundColor: '#28aa0eff', flex: 1, marginLeft: 8, borderRadius: 8 },
  selectInput: { height: 40, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: '#fff' },
  selectInputText: { color: '#333', fontSize: 15 },
  selectorOpcion: { width: '100%', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  selectorOpcionTexto: { fontSize: 16, color: '#222' },
  // DataTable styles
  dataTable: { borderRadius: 10, overflow: 'hidden', marginVertical: 20, backgroundColor: '#f7fafd', elevation: 4 },
  dataRow: { borderBottomWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff' },
  dataCellTitle: { fontWeight: 'bold', color: '#000000ff', fontSize: 15, textAlign: 'right' },
  dataCellValue: { color: '#333', fontSize: 15, textAlign: 'left', fontStyle: 'italic' },
  // Chat estilo WhatsApp
  chatList: { flex: 1, width: '100%' },
  bubbleRow: { width: '100%', paddingHorizontal: 6, marginBottom: 8 },
  alignStart: { alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: '#d0f5d8' },
  bubbleOther: { backgroundColor: '#f0f0f0' },
  senderName: { fontSize: 12, color: '#1976d2', marginBottom: 2 },
  msgText: { fontSize: 15, color: '#222' },
  timeText: { fontSize: 10, color: '#666', marginTop: 4, alignSelf: 'flex-end' },
  composerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  chatModalBody: { position: 'relative', width: '100%', flex: 1, minHeight: 320 },
  composerFloating: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 6, paddingTop: 6, paddingBottom: 8, backgroundColor: '#ffffff', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  composerInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: '#fff', maxHeight: 120, textAlignVertical: 'top' },
  composerSendBtn: { borderRadius: 18, marginLeft: 8, justifyContent: 'center' },
  sendBtn: { backgroundColor: '#1976d2', marginLeft: 8 },
  chatFullScreen: { flex: 1, backgroundColor: '#f5f5f5' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ffffff', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  backBtn: { width: 40, height: 36, justifyContent: 'center', alignItems: 'flex-start' },
  backBtnText: { fontSize: 22, color: '#007bff', fontWeight: 'bold' },
  chatHeaderTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#222', textAlign: 'center' },
});