import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button, FAB, Modal, Portal, TextInput } from 'react-native-paper';

// handler de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function sendPushNotification(expoPushToken: string, body: string) {
  if (!expoPushToken) throw new Error('No hay token de notificaciones');
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'Alerta vecinal',
    body,
    data: { source: 'admin-fab' },
  } as const;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

function handleRegistrationError(errorMessage: string) {
  Alert.alert('Notificaciones', errorMessage);
  throw new Error(errorMessage);
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      handleRegistrationError('Permiso denegado para notificaciones push.');
      return '';
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError('No se encontró el Project ID de EAS/Expo.');
      return '';
    }
    try {
      const token = (
        await Notifications.getExpoPushTokenAsync({ projectId })
      ).data;
      return token;
    } catch (e: any) {
      handleRegistrationError(String(e));
      return '';
    }
  } else {
    handleRegistrationError('Debes usar un dispositivo físico para notificaciones push.');
    return '';
  }
}

export default function PantallaPrincipalAdmin() {
  const { idAdmin } = useLocalSearchParams<{ idAdmin?: string }>();

  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [DatosAnuncio, setDatosAnuncio] = useState<{ contenido: string; idAdmin?: string }>(
    { contenido: '', idAdmin }
  );
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);

  useEffect(() => {
    // Registrar y obtener token
    registerForPushNotificationsAsync()
      .then(async (token) => {
        setExpoPushToken(token ?? '');
        if (token) {
          // Registrar en backend
          try {
            await fetch('http://192.168.0.103:3000/registrarPushToken', {//ruta del backend
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, idUsuario: idAdmin, plataforma: Platform.OS }),
            });
          } catch {}
        }
      })
      .catch((err) => setExpoPushToken(String(err)));

    const notificationListener = Notifications.addNotificationReceivedListener((noti) => {
      setNotification(noti);
    });
    const responseListener = Notifications.addNotificationResponseReceivedListener((resp) => {
      console.log('Respuesta notificación:', resp);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const FuncionAgregarAnuncio = async () => {
    if (!DatosAnuncio.contenido) {
      Alert.alert('Error', 'Debes ingresar el contenido del anuncio');
      return;
    }
    const datosEnviar = {
      ...DatosAnuncio,
      fechaEnvio: new Date().toISOString(),
      titulo: 'Noticia urgente',
      tipo: 'General',
      idAdmin,
    } as const;

    try {
      const res = await fetch('http://192.168.0.103:3000/agregarAnuncio', {//ruta del backend
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnviar),
      });

      const data = await res.json();

      if (res.ok) {
        console.log('Respuesta backend:', data);
        // Enviar notificación push a este dispositivo
        try {
          await sendPushNotification(expoPushToken, datosEnviar.contenido);
          Alert.alert('Éxito', 'Anuncio creado y notificación enviada');
        } catch (err) {
          console.warn('No se pudo enviar la notificación:', err);
          Alert.alert('Éxito', 'Anuncio creado (la notificación no se pudo enviar)');
        }
        setModalAgregarVisible(false);
        setDatosAnuncio({ contenido: '', idAdmin });
      } else {
        console.log('Error backend:', data);
        Alert.alert('Error', 'No se pudo agregar el anuncio');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo agregar el anuncio');
    }
  };

  const handleFabPress = async () => {
    // Si no hay contenido, abre el modal para capturarlo
    if (!DatosAnuncio.contenido.trim()) {
      setModalAgregarVisible(true);
      return;
    }
    // Si ya hay texto, procede a crear anuncio y enviar notificación
    await FuncionAgregarAnuncio();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.screenTitle}>Alerta vecinal</Text>
        <FAB
          icon="alert"
          style={styles.fab}
          size="large"
          onPress={handleFabPress}
          color="white"
        />

        <Portal>
          <Modal visible={modalAgregarVisible} onDismiss={() => setModalAgregarVisible(false)}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Agregar anuncio</Text>
              <TextInput
                placeholder="Contenido"
                value={DatosAnuncio.contenido}
                onChangeText={(v) => setDatosAnuncio({ ...DatosAnuncio, contenido: v })}
                style={styles.input}
              />
              <View style={styles.modalBtns}>
                <Button mode="outlined" onPress={() => setModalAgregarVisible(false)} style={{ marginRight: 10 }}>
                  Cancelar
                </Button>
                <Button mode="contained" onPress={FuncionAgregarAnuncio}>
                  Agregar
                </Button>
              </View>
            </View>
          </Modal>
        </Portal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  screenDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
  fab: {
    position: 'relative',
    margin: 16,
    backgroundColor: '#e34040ff',
    borderRadius: 30,
  },
  modalView: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    width: 250,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
});