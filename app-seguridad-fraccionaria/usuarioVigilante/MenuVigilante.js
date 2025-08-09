import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Appbar, Drawer, IconButton } from 'react-native-paper';



const MenuVigilante = ({ navigation, titulo = "Panel Vigilante" }) => {
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
              <Text style={styles.menuTitle}>Panel Vigilante</Text>
            </View>

            <Drawer.Section title="Gestión Vigilante">

              <Drawer.Item
                label="Panel Principal"
                icon="home"
                onPress={() => navigateToScreen('Vigilante')}
              />
              <Drawer.Item
                label="Alertas"
                icon="bullhorn"
                onPress={() => navigateToScreen('AlertasVigilante')}
              />
              <Drawer.Item
                label="Chats"
                icon="chat"
                onPress={() => navigateToScreen('ChatsVigilante')}
              />
              <Drawer.Item
                label="Consultar Pagos"
                icon="bullhorn"
                onPress={() => navigateToScreen('ConsultarPagosVigilante')}
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

export default MenuVigilante;
