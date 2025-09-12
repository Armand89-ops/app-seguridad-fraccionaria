import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import { setAdminId } from '../lib/session';

function PantallaLogeo () {
const router = useRouter();

const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [mostrarContraseña, setMostrarContraseña] = useState(false);
const [emailTouched, setEmailTouched] = useState(false);

const esCorreoValido = (value: string) => /\S+@\S+\.\S+/.test(value);


const funcionLogin = async() => {
  try {
      const response = await fetch('http://192.168.0.103:3000/login', {//ruta del backend
        method: 'POST',                                     
        headers: { 'Content-Type': 'application/json' },   
        body: JSON.stringify({ 
          email,                                          
          password
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Navegación segun tipo de usuario
        switch (data.tipoUsuario) {
          case 'Administrador':
            setAdminId(data.id);
            router.replace({ pathname: '/usuarioAdministrador/panel', params: { idAdmin: data.id } });
            break;
          case 'Residente':
            router.replace({ pathname: '/usuarioResidente/panel', params: { idResidente: data.id } });
            break;
          case 'Vigilante':
            router.replace({ pathname: '/usuarioVigilante/panel', params: { idVigilante: data.id } });
            break;
          default:
            alert('Tipo de usuario no válido');
        }
      } else {
        alert('Usuario o contraseña incorrectos');
      }
    } catch (error) {
      alert('Error de conexión');
    }
};

return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <Image
          source={require('../assets/images/iconofraccionamiento.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Iniciar sesión</Text>
        
        <TextInput
          mode="outlined"                                  
          label="Correo electrónico"                                
          value={email}                                    
          onChangeText={(t) => {
            setEmail(t);
            if (!emailTouched) setEmailTouched(true);
          }}
          onBlur={() => setEmailTouched(true)}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={emailTouched && !esCorreoValido(email)}
        />
        <HelperText type="error" visible={emailTouched && !esCorreoValido(email)}>
          Ingrese un correo válido (nombre@dominio.com)
        </HelperText>
        
        <TextInput
          mode="outlined"                                 
          label="Contraseña"                           
          value={password}                          
          onChangeText={setPassword}                     
          secureTextEntry={!mostrarContraseña}          
          style={styles.input}                       
          right={
            <TextInput.Icon 
              icon={mostrarContraseña ? "eye-off" : "eye"}  
              onPress={() => setMostrarContraseña(!mostrarContraseña)}
            />
          }
        />

  <Button textColor='#002944' mode="text" onPress={() => router.push('/recuperarPassword')}>
          Recuperar contraseña
        </Button>
        
        <View style={{ height: 16 }} />

        <Button
          textColor= '#ffffffff'
          style={styles.button}
          mode="contained"
          onPress={funcionLogin}
          disabled={!esCorreoValido(email) || !password}
        >
          Iniciar sesión
        </Button>
      </View>
    </SafeAreaView>
  );
}

export default PantallaLogeo;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  
  container: {
    flex: 1,                                             
    justifyContent: 'center',                              
    alignItems: 'center',                                 
    padding: 20,                                        
    backgroundColor: '#ffffff',                      
  },
  
  title: {
    fontSize: 24,                                          
    marginBottom: 20,                                     
    fontWeight: 'bold',                                    
  },
  
  input: {
    width: '100%',                                        
    marginBottom: 16,                                     
  },
  logo: {
    width: 220,
    height: 220,
    marginBottom: 16,
  },
  button: {
    width: '40%',
    marginTop: 8,
    backgroundColor: '#00789c',
  },
});

