import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Platform, TextInput as RNTextInput, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';

type Chat = {
  _id?: string;
  tipo: 'general' | 'edificio' | 'privado' | string;
  nombreEdificio?: string;
  usuarios?: any[]; 
  fechaCreacion?: string;
};

type Mensaje = { _id?: string; idChat: string; idUsuario: any; contenido: string; fechaEnvio: string };

export default function PantallaChatsResidente() {
  const { idResidente } = useLocalSearchParams<{ idResidente?: string }>();
  const baseUrl = useMemo(() => 'http://192.168.0.103:3000', []);//ruta del backend

  const [loading, setLoading] = useState(true);
  const [edificio, setEdificio] = useState<string>('');
  const [usuarios, setUsuarios] = useState<{ _id: any; nombre: string }[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatSeleccionado, setChatSeleccionado] = useState<Chat | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<FlatList<Mensaje>>(null);
  const socketRef = useRef<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputBarHeight = 66; // altura aproximada barra de envío
  const extraOffset = 3; // píxeles extra por encima del teclado

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

  const idYo = useMemo(() => normalizeId(idResidente), [idResidente]);

  // Cargar datos base y conectar socket
  useEffect(() => {
    let cancel = false;
    async function cargar() {
      try {
        const usuariosResp = await fetch(`${baseUrl}/verUsuarios`).then((r) => r.json()).catch(() => []);
        if (cancel) return;
        setUsuarios(Array.isArray(usuariosResp) ? usuariosResp : []);
        const yo = Array.isArray(usuariosResp)
          ? usuariosResp.find((u: any) => normalizeId(u._id) === idYo)
          : null;
        const edif = yo?.Edificio || '';
        setEdificio(edif);

        // Cargar todos los chats y filtrar para este residente
        const todos = await fetch(`${baseUrl}/verChats`).then((r) => r.json()).catch(() => []);
        if (cancel) return;
        const visibles = Array.isArray(todos)
          ? (todos as Chat[]).filter((c) => {
              if (!c) return false;
              if (c.tipo === 'general') return true;
              if (c.tipo === 'edificio') return c.nombreEdificio === edif;
              if (c.tipo === 'privado') return Array.isArray(c.usuarios) && c.usuarios.some((u) => normalizeId(u) === idYo);
              return false;
            })
          : [];
        setChats(visibles);
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    cargar();

    // Conectar socket
    const s = io(baseUrl);
    socketRef.current = s;
    // Cuando se cree un chat, evaluar si es visible para el residente
    s.on('chat:creado', (chat: Chat) => {
      const esMio = chat && (
        chat.tipo === 'general' ||
        (chat.tipo === 'edificio' && chat.nombreEdificio === edificio) ||
        (chat.tipo === 'privado' && Array.isArray(chat.usuarios) && chat.usuarios.some((u) => normalizeId(u) === idYo))
      );
      if (esMio) setChats((prev) => [chat, ...prev]);
    });
    s.on('chat:eliminado', ({ idChat }: { idChat: string }) => {
      setChats((prev) => prev.filter((c) => c._id !== idChat));
      if (chatSeleccionado?._id === idChat) {
        setChatSeleccionado(null);
        setMensajes([]);
      }
    });
    return () => {
      s.disconnect();
      cancel = true;
    };
  }, [idYo]);

  // Abrir chat: cargar mensajes, unirse al room y escuchar en tiempo real
  useEffect(() => {
    const idChat = chatSeleccionado?._id;
    if (!idChat) return;
    let cancel = false;
    (async () => {
      try {
        const data = await fetch(`${baseUrl}/verMensajes/${idChat}`).then((r) => r.json());
        if (cancel) return;
        const ordenados = Array.isArray(data)
          ? [...data].sort((a, b) => new Date(a.fechaEnvio).getTime() - new Date(b.fechaEnvio).getTime())
          : [];
        setMensajes(ordenados as Mensaje[]);
      } catch {
        setMensajes([]);
      }
    })();

    socketRef.current?.emit('join-chat', idChat);
    const handler = (msg: Mensaje) => {
      if (normalizeId(msg.idChat) === normalizeId(idChat)) {
        setMensajes((prev) => (prev.some((m) => m._id && msg._id && m._id === msg._id) ? prev : [...prev, msg]));
      }
    };
    socketRef.current?.on('mensaje:nuevo', handler);
    return () => {
      socketRef.current?.off('mensaje:nuevo', handler as any);
      socketRef.current?.emit('leave-chat', idChat);
      cancel = true;
    };
  }, [chatSeleccionado?._id]);

  // Auto-scroll al final cuando llegan mensajes nuevos
  useEffect(() => {
    if (listaRef.current && mensajes.length > 0) {
      listaRef.current.scrollToEnd({ animated: true });
    }
  }, [mensajes.length]);

  const usuariosMap = useMemo(() => {
    const m = new Map<string, string>();
    usuarios.forEach((u: any) => m.set(normalizeId(u._id), u.nombre));
    return m;
  }, [usuarios]);

  const obtenerNombresUsuarios = (ids?: any[]) => {
    if (!Array.isArray(ids)) return '';
    return ids.map((raw) => usuariosMap.get(normalizeId(raw)) || normalizeId(raw)).join(', ');
  };

  const enviarMensaje = async () => {
    if (enviando) return;
    const txt = (nuevoMensaje || '').trim();
    if (!txt || !chatSeleccionado?._id || !idYo) return;
    setEnviando(true);
    const backup = txt;
    setNuevoMensaje('');
    // Scroll inmediato
    requestAnimationFrame(() => listaRef.current?.scrollToEnd({ animated: true }));
    try {
      await fetch(`${baseUrl}/agregarMensaje`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idChat: chatSeleccionado._id, idUsuario: idYo, contenido: txt }),
      });
      // Llega por socket, sin inserción optimista para evitar duplicados
    } catch {
      setNuevoMensaje(backup); // restaurar si falla
    } finally {
      setEnviando(false);
    }
  };

  // Listeners teclado para barra flotante
  useEffect(() => {
    if (!chatSeleccionado?._id) return;
    const showEvt = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvt = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';
    const onShow = (e: any) => setKeyboardHeight(e?.endCoordinates?.height || 0);
    const onHide = () => setKeyboardHeight(0);
    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => { s1.remove(); s2.remove(); };
  }, [chatSeleccionado?._id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      </SafeAreaView>
    );
  }

  // Vista de mensajes
  if (chatSeleccionado) {
    const titulo = chatSeleccionado.tipo === 'general'
      ? 'Chat General'
      : chatSeleccionado.tipo === 'edificio'
        ? `Chat Edificio: ${chatSeleccionado.nombreEdificio}`
        : chatSeleccionado.tipo === 'privado'
          ? `Chat Privado (${obtenerNombresUsuarios((chatSeleccionado.usuarios || []).filter((u) => normalizeId(u) !== idYo))})`
          : 'Chat';

    return (
      <SafeAreaView style={styles.safeArea} edges={['left','right','bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <View style={styles.chatScreen}>
          {/* Header fijo */}
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => { setChatSeleccionado(null); setMensajes([]); setKeyboardHeight(0); }} style={styles.backBtn}>
                <Text style={styles.backBtnText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>{titulo}</Text>
              <View style={{ width: 40 }} />
            </View>
            <FlatList
              ref={listaRef}
              data={mensajes}
              keyExtractor={(item, idx) => item._id || String(idx)}
              renderItem={({ item }) => {
                const esMio = normalizeId(item.idUsuario) === idYo;
                const nombre = esMio ? 'Yo' : (usuariosMap.get(normalizeId(item.idUsuario)) || 'Usuario');
                return (
                  <View style={[styles.bubbleRow, esMio ? styles.alignEnd : styles.alignStart]}>
                    <View style={[styles.bubble, esMio ? styles.bubbleMine : styles.bubbleOther]}>
                      <Text style={[styles.senderName, esMio && { color: '#0d6b2f' }]}>{nombre}</Text>
                      <Text style={styles.msgText}>{item.contenido}</Text>
                      <Text style={styles.timeText}>{new Date(item.fechaEnvio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </View>
                );
              }}
              style={[{ flex: 1, width: '100%' }, keyboardHeight ? { marginBottom: keyboardHeight } : null]}
              onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: true })}
              contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 2, paddingBottom: 12 + inputBarHeight + extraOffset }}
              keyboardShouldPersistTaps="handled"
            />
            <View style={[styles.inputWrapper, { bottom: keyboardHeight + extraOffset }]}>
              <View style={styles.inputRow}>
                <RNTextInput
                  style={styles.input}
                  value={nuevoMensaje}
                  onChangeText={setNuevoMensaje}
                  placeholder="Mensaje"
                  multiline
                  returnKeyType="send"
                  onSubmitEditing={enviarMensaje}
                />
                <Button
                  mode="contained"
                  style={styles.sendBtn}
                  icon={enviando ? undefined : 'send'}
                  loading={enviando}
                  disabled={enviando || !nuevoMensaje.trim()}
                  onPress={enviarMensaje}
                  labelStyle={styles.sendBtnLabel}
                  contentStyle={{ paddingHorizontal: 10, height: 44 }}
                >
                  {enviando ? 'Enviando' : 'Enviar'}
                </Button>
              </View>
            </View>
        </View>
      </SafeAreaView>
    );
  }

  // Lista de chats
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.container}>
        <Text style={styles.title}>Chats</Text>
        <FlatList
          data={chats}
          keyExtractor={(item, idx) => item._id || String(idx)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatItem} onPress={() => setChatSeleccionado(item)}>
              <Text style={styles.chatTitle}>
                {item.tipo === 'general'
                  ? 'Chat General' 
                  : item.tipo === 'edificio'
                  ? `Chat Edificio: ${item.nombreEdificio}`
                  : `Chat Privado (${obtenerNombresUsuarios((item.usuarios || []).filter((u) => normalizeId(u) !== idYo))})`}
              </Text>
              {item.fechaCreacion ? (
                <Text style={styles.chatSub}>{new Date(item.fechaCreacion).toLocaleString()}</Text>
              ) : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', paddingTop: 24 }}>
              <Text style={{ color: '#777' }}>No hay chats disponibles</Text>
              {edificio ? <Text style={{ color: '#aaa', marginTop: 4 }}>Edificio: {edificio}</Text> : null}
            </View>
          )}
          style={{ width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#333', textAlign: 'center' },
  chatItem: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 12, elevation: 2, width: '100%' },
  chatTitle: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  chatSub: { color: '#666', marginTop: 4, fontSize: 12 },
  // Bubbles
  bubbleRow: { width: '100%', paddingHorizontal: 6, marginBottom: 8 },
  alignStart: { alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: '#d0f5d8' },
  bubbleOther: { backgroundColor: '#f0f0f0' },
  senderName: { fontSize: 12, color: '#1976d2', marginBottom: 2 },
  msgText: { fontSize: 15, color: '#222' },
  timeText: { fontSize: 10, color: '#666', marginTop: 4, alignSelf: 'flex-end' },
  // Input
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', width: '100%' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 12, marginRight: 10, backgroundColor: '#fff', maxHeight: 120 },
  chatScreen: { flex: 1, backgroundColor: '#f5f5f5' },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ffffff', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#222', textAlign: 'center' },
  backBtn: { width: 40, height: 36, justifyContent: 'center', alignItems: 'flex-start' },
  backBtnText: { fontSize: 22, color: '#007bff', fontWeight: 'bold' },
  inputWrapper: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 8, backgroundColor: '#ffffff', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', zIndex: 2 },
  sendBtn: { borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  sendBtnLabel: { color: '#fff', fontWeight: '600' },
});