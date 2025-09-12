import { MaterialIcons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { Image, View } from 'react-native';
import { setAdminId } from '../../../lib/session';

export default function AdminLayout() {
  const router = useRouter();
  const handleLogout = () => {
    setAdminId(null);
    router.replace('/');
  };
  const CustomDrawerContent = (props: any) => (
    <DrawerContentScrollView {...props}>
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Image
          source={require('../../../assets/images/iconofraccionamiento.png')}
          style={{ width: 96, height: 96, borderRadius: 48 }}
          resizeMode="cover"
        />
      </View>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Cerrar sesión"
        onPress={handleLogout}
        icon={({ color, size }) => (
          <MaterialIcons name="logout" size={size} color={color} />
        )}
      />
    </DrawerContentScrollView>
  );
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
  screenOptions={{ headerShown: true, drawerPosition: 'right' }}
    >
      <Drawer.Screen
        name="panel"
        options={{
          title: 'Panel administrativo',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="usuarios"
        options={{
          title: 'Gestión de usuarios',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="people" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="anuncios"
        options={{
          title: 'Gestión de anuncios',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="announcement" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="pagos"
        options={{
          title: 'Gestión de pagos',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="payment" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="chats"
        options={{
          title: 'Gestión de chats',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="chat" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="reglamentoUnidad"
        options={{
          title: 'Reglamento de la unidad',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="gavel" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}
