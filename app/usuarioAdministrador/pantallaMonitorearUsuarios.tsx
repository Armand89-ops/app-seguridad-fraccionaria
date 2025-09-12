import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Platform, Modal as RNModal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Button, DataTable, Dialog, FAB, Modal as PaperModal, Portal, RadioButton, TextInput, } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Usuario = {
  _id?: string;
  id?: string;
  NombreCompleto: string;
  Edificio: string;
  Departamento: string;
  Telefono: string;
  email: string;
  password?: string;
  TipoUsuario: 'Residente' | 'Vigilante' | string;
  Ine?: string;
};

export default function PantallaMonitorearUsuarios() {
  const { idAdmin } = useLocalSearchParams<{ idAdmin?: string }>();
  const insets = useSafeAreaInsets();

  const [nuevoEdificio, setNuevoEdificio] = useState('');
  const [edificios, setEdificios] = useState<string[]>([]);
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [detalleUsuario, setDetalleUsuario] = useState<Usuario | null>(null);
  const [DatosUsuarios, setDatosUsuarios] = useState<Usuario>({
    NombreCompleto: '',
    Edificio: '',
    Departamento: '',
    Telefono: '',
    email: '',
    password: '',
    TipoUsuario: 'Residente',
    Ine: '',
  });
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [imagenGrande, setImagenGrande] = useState<string | null>(null);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<string | null>(null);

  const [dialogVisibleEditar, setDialogVisibleEditar] = useState(false);
  const [usuarioAEditar, setUsuarioAEditar] = useState<Usuario | null>(null);

  const [selectorEdificioVisible, setSelectorEdificioVisible] = useState(false);
  // Helpers de validación
  const soloDigitos10 = (v: string) => (v || '').replace(/\D/g, '').slice(0, 10);
  const trim = (v?: string) => (v ?? '').trim();
  const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const tipoValido = (v: string) => v === 'Residente' || v === 'Vigilante';

  const router = useRouter();
  const [incomingUrl, setIncomingUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  useEffect(() => {
    fetch('http://192.168.0.103:3000/verEdificios')//ruta del backend
      .then((res) => res.json())
      .then((data) => setEdificios(data))
      .catch(() => Alert.alert('Error', 'No se pudieron cargar los edificios'));
  }, [modalAgregarVisible, modalEditarVisible]);

  // Captura deep link notificaciones://ine?url=...
  useEffect(() => {
    let sub: any;
    (async () => {
      const { Linking } = await import('react-native');
      sub = Linking.addEventListener('url', ({ url }) => setIncomingUrl(url));
      const initial = await Linking.getInitialURL();
      if (initial) setIncomingUrl(initial);
    })();
    return () => {
      try { sub?.remove?.(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (!incomingUrl) return;
    try {
      const parsed = new URL(incomingUrl);
      if (parsed.protocol.startsWith('notificaciones:') && parsed.pathname === '/ine') {
        const urlIne = parsed.searchParams.get('url');
        if (urlIne) {
          setDatosUsuarios((prev) => ({ ...prev, Ine: urlIne }));
          Alert.alert('Imagen lista', 'La imagen fue subida y asignada al usuario.');
        }
      }
    } catch {}
  }, [incomingUrl]);

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('http://192.168.0.103:3000/verUsuarios');
      const data = await res.json();
      setUsuarios(data);
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    }
  };

  const FuncionAgregarUsuario = async () => {
    const nombre = trim(DatosUsuarios.NombreCompleto);
    const edificioFinal = DatosUsuarios.Edificio === 'agregar_nuevo' ? trim(nuevoEdificio) : trim(DatosUsuarios.Edificio);
    const departamento = trim(DatosUsuarios.Departamento);
    const telefono = soloDigitos10(DatosUsuarios.Telefono);
    const email = trim(DatosUsuarios.email).toLowerCase();
    const password = trim(DatosUsuarios.password);
    const tipo = trim(DatosUsuarios.TipoUsuario);
    const urlIne = trim(DatosUsuarios.Ine || '');

    // Validaciones
    if (!nombre || !edificioFinal || !departamento || !telefono || !email || !password || !tipo) {
      Alert.alert('Campos obligatorios', 'Completa todos los campos requeridos.');
      return;
    }
    if (telefono.length !== 10) {
      Alert.alert('Teléfono inválido', 'El teléfono debe tener exactamente 10 dígitos.');
      return;
    }
    if (!emailValido(email)) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }
    if (!tipoValido(tipo)) {
      Alert.alert('Tipo de usuario inválido', 'Selecciona Residente o Vigilante.');
      return;
    }

    const usuario: Usuario = {
      NombreCompleto: nombre,
      Edificio: edificioFinal,
      Departamento: departamento,
      Telefono: telefono,
      email,
      password,
      TipoUsuario: tipo as any,
      Ine: urlIne,
    };

    try {
      const res = await fetch('http://192.168.0.103:3000/agregarUsuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario),
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsuarios();
        setModalAgregarVisible(false);
        setDatosUsuarios({
          NombreCompleto: '',
          Edificio: '',
          Departamento: '',
          Telefono: '',
          email: '',
          password: '',
          TipoUsuario: 'Residente',
          Ine: '',
        });
        setNuevoEdificio('');
      } else {
        Alert.alert('Error', 'No se pudo agregar el usuario');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo agregar el usuario');
    }
  };

  const FuncionEditarUsuario = async () => {
    const nombre = trim(DatosUsuarios.NombreCompleto);
    const edificioFinal = DatosUsuarios.Edificio === 'agregar_nuevo' ? trim(nuevoEdificio) : trim(DatosUsuarios.Edificio);
    const departamento = trim(DatosUsuarios.Departamento);
    const telefono = soloDigitos10(DatosUsuarios.Telefono);
    const email = trim(DatosUsuarios.email).toLowerCase();
    const password = trim(DatosUsuarios.password);
    const tipo = trim(DatosUsuarios.TipoUsuario);
    const urlIne = trim(DatosUsuarios.Ine || '');

    // Validaciones
    if (!editUserId) {
      Alert.alert('Error', 'No se encontró el usuario a editar.');
      return;
    }
    if (!nombre || !edificioFinal || !departamento || !telefono || !email || !tipo) {
      Alert.alert('Campos obligatorios', 'Completa todos los campos requeridos.');
      return;
    }
    if (telefono.length !== 10) {
      Alert.alert('Teléfono inválido', 'El teléfono debe tener exactamente 10 dígitos.');
      return;
    }
    if (!emailValido(email)) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido.');
      return;
    }
    if (!tipoValido(tipo)) {
      Alert.alert('Tipo de usuario inválido', 'Selecciona Residente o Vigilante.');
      return;
    }

    try {
      const body = { NombreCompleto: nombre, Edificio: edificioFinal, Departamento: departamento, Telefono: telefono, email, password, TipoUsuario: tipo, Ine: urlIne, id: editUserId };
      const res = await fetch('http://192.168.0.103:3000/editarUsuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        fetchUsuarios();
        setModalEditarVisible(false);
        setEditUserId(null);
        setDatosUsuarios({
          NombreCompleto: '',
          Edificio: '',
          Departamento: '',
          Telefono: '',
          email: '',
          password: '',
          TipoUsuario: 'Residente',
          Ine: '',
        });
        setNuevoEdificio('');
      } else {
        Alert.alert('Error', 'No se pudo editar el usuario');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo editar el usuario');
    }
  };

  const FuncionEliminarUsuario = async (id?: string) => {
    if (!id) return;
    try {
      const res = await fetch('http://192.168.0.103:3000/eliminarUsuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchUsuarios();
      } else {
        Alert.alert('Error', 'No se pudo eliminar el usuario');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo eliminar el usuario');
    }
  };

  const AccionLadoDerecho = (user: Usuario) => (
    <TouchableOpacity
      style={[styles.action, styles.edit]}
      onPress={() => {
        setUsuarioAEditar(user);
        setDialogVisibleEditar(true);
      }}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name="edit" size={24} color="#fff" />
        <Text style={styles.text}>Editar</Text>
      </View>
    </TouchableOpacity>
  );

  const AccionLadoIzquierdo = (user: Usuario) => (
    <TouchableOpacity
      style={[styles.action, styles.delete]}
      onPress={() => {
        setUsuarioAEliminar(user._id || user.id || null);
        setDialogVisible(true);
      }}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name="delete" size={24} color="#fff" />
        <Text style={styles.text}>Eliminar</Text>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Usuario }) => (
    <Swipeable renderLeftActions={() => AccionLadoIzquierdo(item)} renderRightActions={() => AccionLadoDerecho(item)}>
      <TouchableOpacity style={styles.item} onPress={() => setDetalleUsuario(item)}>
        <View style={styles.row}>
          <View style={styles.iconRight}>
            <Image
              source={item.Ine ? { uri: item.Ine } : require('../../assets/images/icon.png')}
              style={{ width: 120, height: 70, borderRadius: 8 }}
            />
          </View>
          <View style={{ flex: 0.9 }}>
            <Text style={styles.dataCellValue}>
              <Text style={styles.nombre}>Nombre:</Text> {item.NombreCompleto}{'   '}
              <Text style={styles.nombre}>Edificio:</Text> {item.Edificio}{'   '}
              <Text style={styles.nombre}>Departamento:</Text> {item.Departamento}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  // Selección y subida de imagen INE.
  const seleccionarImagen = async () => {
    try {
      const mod = await import('expo-image-picker');
      const Picker: any = (mod as any).default ?? mod; // compat

      if (Platform.OS !== 'web') {
        if (typeof Picker.requestMediaLibraryPermissionsAsync === 'function') {
          const { status } = await Picker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Se necesita permiso para acceder a tus fotos.');
            return;
          }
        }
      }

      const mediaType = (Picker as any).MediaType?.image || (Picker as any).MediaType?.Images || (Picker as any).MediaType?.IMAGE;
      const mediaTypesProp = mediaType ? [mediaType] : undefined; // si falla, expo usará default (todas las imágenes)
      const result = await Picker.launchImageLibraryAsync({
        mediaTypes: mediaTypesProp,
        allowsEditing: true,
        quality: 1,
        aspect: [4, 3],
      });

      if (result?.canceled) return;
      if (!result?.assets?.length) {
        Alert.alert('Error', 'No se seleccionó ninguna imagen.');
        return;
      }

      const asset = result.assets[0];
      const data = new FormData();
      // @ts-ignore FormData RN
      data.append('imagen', {
        uri: asset.uri,
        type: (asset as any).mimeType || 'image/jpeg',
        name: (asset as any).fileName || 'ine.jpg',
      });

      const response = await fetch('http://192.168.0.103:3000/subirIne', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) throw new Error('Error subiendo imagen');
      const info = await response.json();
      setDatosUsuarios((prev) => ({ ...prev, Ine: info.url }));
    } catch (error: any) {
      const msg = String(error?.message || error);
      if (msg.includes('ExponentImagePicker') || msg.includes('Native module cannot be null')) {
        Alert.alert('Módulo no disponible', 'Si estás en un entorno sin el módulo nativo, prueba crear un build nativo: npx expo run:android.');
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  return (
    <SafeAreaView style={styles.containerSafeArea}>
      <View style={styles.content}>
        <FAB
          icon="account-plus"
          color="#000000ff"
          style={[styles.fab, { bottom: (insets.bottom || 0) + 18 }]}
          size="large"
          onPress={() => {
            setModalAgregarVisible(true);
            setDatosUsuarios({
              NombreCompleto: '',
              Edificio: '',
              Departamento: '',
              Telefono: '',
              email: '',
              password: '',
              TipoUsuario: 'Residente',
              Ine: '',
            });
          }}
        />

        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id?.toString() || item._id?.toString() || Math.random().toString()}
          renderItem={renderItem}
        />

        {/* Modal Detalles */}
        <Portal>
          <PaperModal visible={!!detalleUsuario} onDismiss={() => setDetalleUsuario(null)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Detalles del usuario</Text>
              {detalleUsuario?.Ine ? (
                <TouchableOpacity onPress={() => setImagenGrande(detalleUsuario.Ine!)}>
                  <Image source={{ uri: detalleUsuario.Ine }} style={{ width: 250, height: 152 }} />
                </TouchableOpacity>
              ) : null}
              <DataTable style={styles.dataTable}>
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell>
                    <Text style={styles.dataCellTitle}>Nombre: </Text>
                    <Text style={styles.dataCellValue}>{detalleUsuario?.NombreCompleto}</Text>
                  </DataTable.Cell>
                </DataTable.Row>
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell>
                    <Text style={styles.dataCellTitle}>Edificio:  </Text>
                    <Text style={styles.dataCellValue}>{detalleUsuario?.Edificio}</Text>
                  </DataTable.Cell>
                </DataTable.Row>
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell>
                    <Text style={styles.dataCellTitle}>Departamento:  </Text>
                    <Text style={styles.dataCellValue}>{detalleUsuario?.Departamento}</Text>
                  </DataTable.Cell>
                </DataTable.Row>
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell>
                    <Text style={styles.dataCellTitle}>Teléfono:  </Text>
                    <Text style={styles.dataCellValue}>{detalleUsuario?.Telefono}</Text>
                  </DataTable.Cell>
                </DataTable.Row>
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell>
                    <Text style={styles.dataCellTitle}>Correo:  </Text>
                    <Text style={styles.dataCellValue} numberOfLines={1}>
                      {detalleUsuario?.email}
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
                <DataTable.Row style={styles.dataRow}>
                  <DataTable.Cell>
                    <Text style={styles.dataCellTitle}>Tipo:  </Text>
                    <Text style={styles.dataCellValue}>{detalleUsuario?.TipoUsuario}</Text>
                  </DataTable.Cell>
                </DataTable.Row>
              </DataTable>
              <Button style={{ backgroundColor: '#2732f1ff' }} icon="keyboard-backspace" mode="contained" onPress={() => setDetalleUsuario(null)}>
                Regresar
              </Button>
            </View>
          </PaperModal>
        </Portal>

        {/* Imagen en grande (RN Modal) */}
        <RNModal visible={!!imagenGrande} transparent animationType="fade" onRequestClose={() => setImagenGrande(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
            {imagenGrande ? (
              <Image source={{ uri: imagenGrande }} style={{ width: 300, height: 400, resizeMode: 'contain' }} />
            ) : null}
            <Button style={{ backgroundColor: '#f12727ff', marginTop: 12 }} icon="close" mode="contained" onPress={() => setImagenGrande(null)}>
              Cerrar
            </Button>
          </View>
        </RNModal>

        {/* Modal Agregar */}
        <Portal>
          <PaperModal visible={modalAgregarVisible} onDismiss={() => setModalAgregarVisible(false)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Agregar usuario</Text>
              <TextInput mode="outlined" label="Nombre completo" style={styles.input} value={DatosUsuarios.NombreCompleto} onChangeText={(v) => setDatosUsuarios({ ...DatosUsuarios, NombreCompleto: v })} />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '80%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, marginRight: 8 }}>Edificio:</Text>
                <TouchableOpacity onPress={() => setSelectorEdificioVisible(true)} style={styles.selectInput}>
                  <Text style={styles.selectInputText}>{DatosUsuarios.Edificio || 'Seleccionar...'}</Text>
                </TouchableOpacity>
              </View>

              {DatosUsuarios.Edificio === 'agregar_nuevo' && (
                <TextInput mode="outlined" label="Nombre del nuevo edificio" value={nuevoEdificio} onChangeText={setNuevoEdificio} style={styles.input} />
              )}

              <TextInput mode="outlined" label="Departamento" style={styles.input} value={DatosUsuarios.Departamento} onChangeText={(v) => setDatosUsuarios({ ...DatosUsuarios, Departamento: v })} />
              <TextInput mode="outlined" label="Teléfono" style={styles.input} value={DatosUsuarios.Telefono} onChangeText={(v) => setDatosUsuarios({ ...DatosUsuarios, Telefono: soloDigitos10(v) })} keyboardType="number-pad" maxLength={10} />
              <TextInput mode="outlined" label="Correo electrónico" style={styles.input} value={DatosUsuarios.email} onChangeText={(v) => setDatosUsuarios({ ...DatosUsuarios, email: v })} keyboardType="email-address" autoCapitalize="none" />
              <TextInput mode="outlined" label="Contraseña" value={DatosUsuarios.password} onChangeText={(v) => setDatosUsuarios({ ...DatosUsuarios, password: v })} style={styles.input} />
              <Button style={{ backgroundColor: '#00eaffff', marginBottom: 8 }} icon="image-size-select-actual" mode="elevated" onPress={seleccionarImagen} labelStyle={{ color: '#000000ff' }}>
                Seleccionar imagen INE
              </Button>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '80%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, minWidth: 110 }}>Tipo usuario:</Text>
                <RadioButton.Group onValueChange={(value) => setDatosUsuarios({ ...DatosUsuarios, TipoUsuario: value })} value={DatosUsuarios.TipoUsuario}>
                  <View style={{ alignItems: 'center' }}>
                    <RadioButton.Item color="#007bffff" label="Residente" value="Residente" />
                    <RadioButton.Item color="#007bffff" label="Vigilante" value="Vigilante" />
                  </View>
                </RadioButton.Group>
              </View>

              {DatosUsuarios.Ine ? (
                <View style={{ alignItems: 'center', marginVertical: 10 }}>
                  <Image source={{ uri: DatosUsuarios.Ine }} style={{ width: 150, height: 100, borderRadius: 8, marginBottom: 5 }} />
                </View>
              ) : null}

              <View style={styles.modalBtns}>
                <Button style={[styles.cancelar, { flex: 1, marginRight: 8 }]} icon="cancel" mode="elevated" onPress={() => setModalAgregarVisible(false)} labelStyle={{ color: '#fff' }}>
                  Cancelar
                </Button>
                <Button style={[styles.agregar, { flex: 1, marginLeft: 8 }]} icon="account-plus" mode="elevated" onPress={FuncionAgregarUsuario} labelStyle={{ color: '#fff' }}>
                  Agregar
                </Button>
              </View>
            </View>
          </PaperModal>
        </Portal>

        {/* Modal Editar */}
        <Portal>
          <PaperModal visible={modalEditarVisible} onDismiss={() => setModalEditarVisible(false)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Editar usuario</Text>
              <TextInput mode="outlined" label="Nombre completo" value={DatosUsuarios.NombreCompleto} onChangeText={(v) => setDatosUsuarios({ ...DatosUsuarios, NombreCompleto: v })} style={styles.input} />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '80%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, marginRight: 8 }}>Edificio:</Text>
                <TouchableOpacity onPress={() => setSelectorEdificioVisible(true)} style={styles.selectInput}>
                  <Text style={styles.selectInputText}>{DatosUsuarios.Edificio || 'Seleccionar...'}</Text>
                </TouchableOpacity>
              </View>

              {DatosUsuarios.Edificio === 'agregar_nuevo' && (
                <TextInput mode="outlined" placeholder="Nombre del nuevo edificio" value={nuevoEdificio} onChangeText={setNuevoEdificio} style={styles.input} />
              )}

              <TextInput mode="outlined" label="Departamento" value={DatosUsuarios.Departamento} onChangeText={(v) => setDatosUsuarios({ ...DatosUsuarios, Departamento: v })} style={styles.input} />
              <TextInput mode="outlined" label="Teléfono" value={DatosUsuarios.Telefono} onChangeText={(v) => setDatosUsuarios({ ...DatosUsuarios, Telefono: soloDigitos10(v) })} style={styles.input} keyboardType="number-pad" maxLength={10} />
              <TextInput mode="outlined" label="Correo electrónico" value={DatosUsuarios.email} onChangeText={(v) => setDatosUsuarios({ ...DatosUsuarios, email: v })} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
              <Button style={{ backgroundColor: '#00eaffff', marginBottom: 8 }} icon="image-size-select-actual" mode="elevated" onPress={seleccionarImagen} labelStyle={{ color: '#000000ff' }}>
                Seleccionar imagen INE
              </Button>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '80%' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 17, minWidth: 110 }}>Tipo usuario:</Text>
                <RadioButton.Group onValueChange={(value) => setDatosUsuarios({ ...DatosUsuarios, TipoUsuario: value })} value={DatosUsuarios.TipoUsuario}>
                  <View style={{ alignItems: 'center' }}>
                    <RadioButton.Item color="#007bffff" label="Residente" value="Residente" />
                    <RadioButton.Item color="#007bffff" label="Vigilante" value="Vigilante" />
                  </View>
                </RadioButton.Group>
              </View>

              {DatosUsuarios.Ine ? (
                <View style={{ alignItems: 'center', marginVertical: 10 }}>
                  <Image source={{ uri: DatosUsuarios.Ine }} style={{ width: 150, height: 100, borderRadius: 8, marginBottom: 5 }} />
                </View>
              ) : null}

              <View style={styles.modalBtns}>
                <Button style={[styles.cancelar, { flex: 1, marginRight: 8 }]} icon="cancel" mode="elevated" onPress={() => setModalEditarVisible(false)} labelStyle={{ color: '#fff' }}>
                  Cancelar
                </Button>
                <Button style={[styles.agregar, { flex: 1, marginLeft: 8 }]} icon="account-edit" mode="elevated" onPress={FuncionEditarUsuario} labelStyle={{ color: '#fff' }}>
                  Editar
                </Button>
              </View>
            </View>
          </PaperModal>
        </Portal>

        {/* Dialog Eliminar */}
        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
            <Dialog.Title>Confirmar eliminación</Dialog.Title>
            <Dialog.Content>
              <Text>¿Estás seguro de que deseas eliminar este usuario?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogVisible(false)} labelStyle={{ color: '#1976d2' }} icon="close">
                Cancelar
              </Button>
              <Button
                onPress={() => {
                  setDialogVisible(false);
                  FuncionEliminarUsuario(usuarioAEliminar || undefined);
                }}
                labelStyle={{ color: '#d32f2f' }}
                icon="delete"
              >
                Eliminar
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Dialog Editar  */}
        <Portal>
          <Dialog visible={dialogVisibleEditar} onDismiss={() => setDialogVisibleEditar(false)}>
            <Dialog.Title>Confirmar edición</Dialog.Title>
            <Dialog.Content>
              <Text>¿Estás seguro de que deseas editar este usuario?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogVisibleEditar(false)}>Cancelar</Button>
              <Button
                onPress={() => {
                  setDialogVisibleEditar(false);
                  if (!usuarioAEditar) return;
                  setEditUserId(usuarioAEditar._id || usuarioAEditar.id || null);
                  setDatosUsuarios({
                    NombreCompleto: usuarioAEditar.NombreCompleto || '',
                    Edificio: usuarioAEditar.Edificio || '',
                    Departamento: usuarioAEditar.Departamento || '',
                    Telefono: usuarioAEditar.Telefono || '',
                    email: usuarioAEditar.email || '',
                    password: usuarioAEditar.password || '',
                    TipoUsuario: usuarioAEditar.TipoUsuario || 'Residente',
                    Ine: usuarioAEditar.Ine || '',
                  });
                  setModalEditarVisible(true);
                }}
              >
                Editar
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Selector de Edificio */}
        <Portal>
          <PaperModal visible={selectorEdificioVisible} onDismiss={() => setSelectorEdificioVisible(false)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Seleccionar edificio</Text>
              <FlatList
                style={{ width: '100%' }}
                data={[...edificios, 'agregar_nuevo']}
                keyExtractor={(item, idx) => item + idx}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      const valor = item;
                      setDatosUsuarios((prev) => ({ ...prev, Edificio: valor }));
                      if (valor !== 'agregar_nuevo') setNuevoEdificio('');
                      setSelectorEdificioVisible(false);
                    }}
                    style={styles.selectorOpcion}
                  >
                    <Text style={styles.selectorOpcionTexto}>
                      {item === 'agregar_nuevo' ? 'Agregar nuevo edificio…' : item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
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
  item: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconRight: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    height: 80,
    marginRight: 16,
    backgroundColor: '#ffffffff',
    borderRadius: 8,
  },
  nombre: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
    marginBottom: 2,
  },
  editBtn: { backgroundColor: 'blue', justifyContent: 'center', alignItems: 'center', width: 100 },
  deleteBtn: { backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', width: 100 },
  modalView: { margin: 20, backgroundColor: 'white', borderRadius: 10, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, alignSelf: 'center' },
  input: { width: 290, height: 40, borderRadius: 10, marginBottom: 8 },
  containerSafeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: { flex: 1, padding: 20 },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 10,
    margin: 14,
    minWidth: 30,
    justifyContent: 'center',
  },
  delete: { backgroundColor: '#d32f2f' },
  edit: { backgroundColor: '#1976d2' },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    backgroundColor: '#21f3f3ff',
    elevation: 8,
    zIndex: 999,
    borderRadius: 30,
  },
  dataTable: {
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 20,
    backgroundColor: '#f7fafd',
    elevation: 4,
  },
  dataRow: {
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  dataCellTitle: {
    fontWeight: 'bold',
    color: '#000000ff',
    fontSize: 15,
    textAlign: 'right',
  },
  dataCellValue: {
    color: '#333',
    fontSize: 15,
    textAlign: 'left',
    fontStyle: 'italic',
  },
  cancelar: {
    backgroundColor: '#f20000ff',
  },
  agregar: {
    backgroundColor: '#28aa0eff',
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  selectInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  selectInputText: {
    color: '#333',
    fontSize: 15,
  },
  selectorOpcion: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  selectorOpcionTexto: {
    fontSize: 16,
    color: '#222',
  },
});