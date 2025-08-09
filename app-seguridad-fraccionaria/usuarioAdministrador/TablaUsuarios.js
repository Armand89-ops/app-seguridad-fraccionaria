import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button, Modal, TextInput, Image, Alert } from 'react-native';
import { Portal } from 'react-native-paper';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import MenuAdministrador from './MenuAdministrador';
import { SafeAreaView } from 'react-native-safe-area-context';


const TablaUsuarios = ({ navigation }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detalleUsuario, setDetalleUsuario] = useState(null);
  const [DatosUsuarios, setDatosUsuarios] = useState({
    NombreCompleto: '',
    Edificio: '',
    Departamento: '',
    Telefono: '',
    email: '',
    password: '',
    TipoUsuario: '',
    Ine: ''
  });
  const [editUserId, setEditUserId] = useState(null);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('http://192.168.0.112:3000/verUsuarios');
      const data = await res.json();
      setUsuarios(data);
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    }
  };

  const FuncionAgregarUsuario  = async () => {
    try {
      console.log('Datos enviados a backend:', DatosUsuarios);
      const res = await fetch('http://192.168.0.112:3000/anadirUsuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DatosUsuarios),
      });
      const data = await res.json();
      console.log('Respuesta backend añadirUsuarios:', data);
      if (res.ok) {
        fetchUsuarios();
        setModalVisible(false);
        setDatosUsuarios({
          NombreCompleto: '',
          Edificio: '',
          Departamento: '',
          Telefono: '',
          email: '',
          password: '',
          TipoUsuario: '',
          Ine: ''
        });
      } else {
        Alert.alert('Error', 'No se pudo agregar el usuario');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo agregar el usuario');
    }
  }

  const FuncionEditarUsuario = async () => {
    try {
      const body = { ...DatosUsuarios, id: editUserId };
      const res = await fetch('http://192.168.0.112:3000/editarUsuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        fetchUsuarios();
        setModalVisible(false);
        setEditUserId(null);
        setDatosUsuarios({
          NombreCompleto: '',
          Edificio: '',
          Departamento: '',
          Telefono: '',
          email: '',
          password: '',
          TipoUsuario: '',
          Ine: ''
        });
      } else {
        Alert.alert('Error', 'No se pudo editar el usuario');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo editar el usuario');
    }
  }

  const FuncionEliminarUsuario = async (id) => {
    try {
      const res = await fetch('http://192.168.0.112:3000/eliminarUsuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        console.log('ID a eliminar:', id);
        fetchUsuarios();
      } else {
        Alert.alert('Error', 'No se pudo eliminar el usuario');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo eliminar el usuario');
    }
  };

  const AccionLadoDerecho = (user) => (
    <TouchableOpacity style={styles.editBtn} onPress={() => {
      setEditUserId(user._id || user.id);
      setDatosUsuarios({
        NombreCompleto: user.NombreCompleto || '',
        Edificio: user.Edificio || '',
        Departamento: user.Departamento || '',
        Telefono: user.Telefono || '',
        email: user.email || '',
        password: user.password || '',
        TipoUsuario: user.TipoUsuario || '',
        Ine: user.Ine || ''
      });
      setModalVisible(true);
    }}>
      <Text style={{ color: 'white' }}>Editar</Text>
    </TouchableOpacity>
  );

  const AccionLadoIzquierdo = (user) => (
    <TouchableOpacity style={styles.deleteBtn} onPress={() => FuncionEliminarUsuario(user._id || user.id)}>
      <Text style={{ color: 'white' }}>Dar de baja</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (
    <Swipeable
      renderLeftActions={() => AccionLadoIzquierdo(item)}
      renderRightActions={() => AccionLadoDerecho(item)}
    >
      <TouchableOpacity style={styles.row} onPress={() => setDetalleUsuario(item)}>
        <Text style={styles.NombreCompleto}>{item.NombreCompleto}</Text>
        <Text>{item.Edificio}</Text>
        <Text>{item.Departamento}</Text>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.containerSafeArea}>
      <View style={styles.containerSafeArea}>
        <MenuAdministrador navigation={navigation} titulo="Tabla de Usuarios" />
        <Button title="Agregar usuario" onPress={() => { setModalVisible(true); setEditUserId(null); }} />
        <FlatList
          data={usuarios}
          keyExtractor={item => item.id?.toString() || item._id?.toString()}
          renderItem={renderItem}
          ListHeaderComponent={() => (
            <View style={styles.header}>
              <Text style={styles.headerText}>Nombre</Text>
              <Text style={styles.headerText}>Edificio</Text>
              <Text style={styles.headerText}>Departamento</Text>
            </View>
          )}
      />
      <Portal>
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{editUserId ? 'Editar usuario' : 'Agregar usuario'}</Text>
            <TextInput placeholder="Nombre completo" value={DatosUsuarios.NombreCompleto} onChangeText={v => setDatosUsuarios({ ...DatosUsuarios, NombreCompleto: v })} style={styles.input} />
            <TextInput placeholder="Edificio" value={DatosUsuarios.Edificio} onChangeText={v => setDatosUsuarios({ ...DatosUsuarios, Edificio: v })} style={styles.input} />
            <TextInput placeholder="Departamento" value={DatosUsuarios.Departamento} onChangeText={v => setDatosUsuarios({ ...DatosUsuarios, Departamento: v })} style={styles.input} />
            <TextInput placeholder="Teléfono" value={DatosUsuarios.Telefono} onChangeText={v => setDatosUsuarios({ ...DatosUsuarios, Telefono: v })} style={styles.input} />
            <TextInput placeholder="Correo electrónico" value={DatosUsuarios.email} onChangeText={v => setDatosUsuarios({ ...DatosUsuarios, email: v })} style={styles.input} />
            <TextInput placeholder="Tipo de residente" value={DatosUsuarios.TipoUsuario} onChangeText={v => setDatosUsuarios({ ...DatosUsuarios, TipoUsuario: v })} style={styles.input} />
            <TextInput placeholder="Contraseña" value={DatosUsuarios.password} onChangeText={v => setDatosUsuarios({ ...DatosUsuarios, password: v })} style={styles.input} secureTextEntry />
            <TextInput placeholder="URL de imagen INE" value={DatosUsuarios.Ine} onChangeText={v => setDatosUsuarios({ ...DatosUsuarios, Ine: v })} style={styles.input} />
            <View style={styles.modalBtns}>
              <Button title="Cancelar" onPress={() => setModalVisible(false)} />
              <Button title={editUserId ? 'Guardar' : 'Agregar'} onPress={editUserId ? FuncionEditarUsuario : FuncionAgregarUsuario } />
            </View>
          </View>
        </Modal>
      </Portal>
      {detalleUsuario && (
        <Portal>
          <Modal visible={!!detalleUsuario} animationType="slide" transparent={true}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Detalles del usuario</Text>
              <Text>Nombre: {detalleUsuario.NombreCompleto}</Text>
              <Text>Edificio: {detalleUsuario.Edificio}</Text>
              <Text>Departamento: {detalleUsuario.Departamento}</Text>
              <Text>Teléfono: {detalleUsuario.Telefono}</Text>
              <Text>Correo: {detalleUsuario.email}</Text>
              <Text>Tipo: {detalleUsuario.TipoUsuario}</Text>
              {detalleUsuario.Ine ? <Image source={{ uri: detalleUsuario.Ine }} style={{ width: 100, height: 100 }} /> : null}
              <Button title="Cerrar" onPress={() => setDetalleUsuario(null)} />
            </View>
          </Modal>
        </Portal>
      )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10 },
  headerText: { fontWeight: 'bold', width: '33%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderColor: '#eee' },
  nombre: { fontWeight: 'bold', width: '33%' },
  editBtn: { backgroundColor: 'blue', justifyContent: 'center', alignItems: 'center', width: 100 },
  deleteBtn: { backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', width: 100 },
  modalView: { margin: 20, backgroundColor: 'white', borderRadius: 10, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  input: { width: 250, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between', width: 200 },
  containerSafeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TablaUsuarios;
