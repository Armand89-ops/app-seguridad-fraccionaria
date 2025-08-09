import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Appbar, Drawer, IconButton } from 'react-native-paper';



const MenuAdministrador = ({ navigation, titulo = "Panel Administrativo" }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleMenu = () => setMenuVisible(!menuVisible);

  const navigateToScreen = (screenName) => {
    setMenuVisible(false);
    navigation.navigate(screenName);
  };

  const cerrarSesion = () => {
    setMenuVisible(false);
    navigation.navigate('Inicio de sesion');
  };

  return (
    <>
      {/* Header */}
      <Appbar.Header style={styles.header}>
        <IconButton
          icon="menu"
          iconColor="#fff"
          size={24}
          onPress={toggleMenu}
        />
        <Appbar.Content 
          title={titulo} 
          titleStyle={styles.headerTitle}
        />
      </Appbar.Header>

      {/* Menú lateral */}
      {menuVisible && (
        <View style={styles.overlay}>
          <View style={styles.menu}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Panel Administrativo</Text>
            </View>
            
            <Drawer.Section title="Gestión Administrativa">
              <Drawer.Item
                label="Panel Principal"
                icon="home"
                onPress={() => navigateToScreen('Administrador')}
              />
              <Drawer.Item
                label="Gestión de Usuarios"
                icon="account-group"
                onPress={() => navigateToScreen('TablaUsuarios')}
              />
              <Drawer.Item
                label="Envío de Anuncios"
                icon="bullhorn"
                onPress={() => navigateToScreen('EnvioAnuncios')}
              />
              <Drawer.Item
                label="Reglamento de Unidad"
                icon="file-document"
                onPress={() => navigateToScreen('ReglamentoUnidad')}
              />
              <Drawer.Item
                label="Monitoreo de Chats"
                icon="chat"
                onPress={() => navigateToScreen('CreacionChats')}
              />
              <Drawer.Item
                label="Módulos de Pagos"
                icon="credit-card"
                onPress={() => navigateToScreen('ModulosPagos')}
              />
              <Drawer.Item
                label="Envío de Recordatorios"
                icon="bell"
                onPress={() => navigateToScreen('EnvioRecordatorios')}
              />
            </Drawer.Section>
            
            <Drawer.Section title="Sesión">
              <Drawer.Item
                label="Cerrar Sesión"
                icon="logout"
                onPress={cerrarSesion}
              />
            </Drawer.Section>
          </View>
          
          {/* Overlay para cerrar el menú al tocar fuera */}
          <View 
            style={styles.overlayBackground} 
            onTouchEnd={() => setMenuVisible(false)} 
          />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#6200ee',
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 56, // Altura del header
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row-reverse', // Cambia a row-reverse para menú derecho
  },
  menu: {
    width: 280,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: '100%',
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuHeader: {
    padding: 20,
    backgroundColor: '#6200ee',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default MenuAdministrador;
