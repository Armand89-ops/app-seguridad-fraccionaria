import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';

export default function RecuperarPassword() {
  const router = useRouter();
  const [correo, setCorreo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [correoTocado, setCorreoTocado] = useState(false);
  
  const esCorreoValido = (valor: string) => /\S+@\S+\.\S+/.test(valor);

  const solicitarRecuperacion = async () => {
    if (!esCorreoValido(correo)) {
      Alert.alert('Error', 'Ingrese un correo válido');
      return;
    }
    try {
      const res = await fetch('http://192.168.0.103:3000/recuperarContrasena', { //ruta del backend
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo }),
      });
      if (res.ok) {
        setEnviado(true);
      } else {
        Alert.alert('Error', 'No se pudo enviar el correo de recuperación');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar al servidor');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('../assets/images/iconofraccionamiento.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Recuperar contraseña</Text>
        <TextInput
          label="Correo electrónico"
          mode="outlined"
          value={correo}
          onChangeText={(t) => {
            setCorreo(t);
            if (!correoTocado) setCorreoTocado(true);
          }}
          onBlur={() => setCorreoTocado(true)}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={correoTocado && !esCorreoValido(correo)}
        />
        <HelperText type="error" visible={correoTocado && !esCorreoValido(correo)}>
          Ingresa un correo válido (nombre@dominio.com)
        </HelperText>
        <Button textColor='#ffffffff' style={styles.button} mode="contained" onPress={solicitarRecuperacion} disabled={!esCorreoValido(correo)}>
          Enviar correo de recuperación
        </Button>
        {enviado && (
          <Text style={styles.info}>
            Si el correo existe, recibirás instrucciones para restablecer tu contraseña.
          </Text>
        )}
        <Button textColor="#002944" mode="text" onPress={() => router.back()} style={{ marginTop: 16 }}>
          Volver
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    marginBottom: 16,
  },
  info: {
    color: 'green',
    marginTop: 16,
    textAlign: 'center',
  },
  logo: {
    width: 220,
    height: 220,
    marginBottom: 16,
  },
  button: {
    width: '70%',
    marginTop: 8,
    backgroundColor: '#00789c',
  },
});