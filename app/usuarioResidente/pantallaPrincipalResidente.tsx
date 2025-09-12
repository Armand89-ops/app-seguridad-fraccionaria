import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Button, FAB, Modal, Portal, TextInput } from 'react-native-paper';

// Configurar handler de notificaciones
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
    data: { source: 'residente-fab' },
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

export default function PantallaPrincipalResidente() {
  const { idResidente } = useLocalSearchParams<{ idResidente?: string }>();
  const baseUrl = useMemo(() => 'http://192.168.0.103:3000', []);//ruta del backend

  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [contenido, setContenido] = useState('');
  const enviando = false;
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(async (token) => {
        setExpoPushToken(token ?? '');
        if (token) {
          try {
            await fetch('http://192.168.0.103:3000/registrarPushToken', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, idUsuario: idResidente, plataforma: Platform.OS }),
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

  const FuncionAgregarAnuncioResidente = async () => {
    const txt = (contenido || '').trim();
    if (!txt) {
      Alert.alert('Error', 'Debes ingresar el contenido del anuncio');
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/agregarAnuncio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenido: txt,
          fechaEnvio: new Date().toISOString(),
          titulo: 'Noticia urgente',
          tipo: 'General',
          idResidente: idResidente || null,
        }),
      });
      if (res.ok) {
        await res.json().catch(() => ({}));
        // Enviar push al dispositivo actual
        try {
          await sendPushNotification(expoPushToken, txt);
          Alert.alert('Éxito', 'Anuncio creado y notificación enviada');
        } catch (err) {
          console.warn('No se pudo enviar la notificación:', err);
          Alert.alert('Éxito', 'Anuncio creado (la notificación no se pudo enviar)');
        }
        setModalAgregarVisible(false);
        setContenido('');
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.log('Error backend:', errorData);
        Alert.alert('Error', 'No se pudo agregar el anuncio');
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo agregar el anuncio');
    }
  };

  const handleFabPress = async () => {
    if (!contenido.trim()) {
      setModalAgregarVisible(true);
      return;
    }
    await FuncionAgregarAnuncioResidente();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Botón de pánico</Text>
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
                value={contenido}
                onChangeText={setContenido}
                style={styles.input}
                multiline
              />
              <View style={styles.modalBtns}>
                <Button mode="outlined" onPress={() => setModalAgregarVisible(false)} style={{ marginRight: 10 }}>
                  Cancelar
                </Button>
                <Button mode="contained" onPress={FuncionAgregarAnuncioResidente} loading={enviando}>
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
  safeArea: {
    flex: 1,
  backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  fab: {
    margin: 16,
    backgroundColor: '#e34040ff',
    alignSelf: 'center',
    position: 'relative',
    elevation: 4,
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
    width: 280,
    minHeight: 80,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
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