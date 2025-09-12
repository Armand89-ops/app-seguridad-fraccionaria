import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { Avatar, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type Anuncio = {
  _id?: string;
  titulo?: string;
  contenido: string;
  tipo: 'General' | 'Edificio' | string;
  nombreEdificio?: string;
  fechaEnvio?: string;
};

export default function PantallaAnunciosResidente() {
  const { idResidente } = useLocalSearchParams<{ idResidente?: string }>();
  const baseUrl = useMemo(() => 'http://192.168.0.103:3000', []);//ruta del backend
  const [edificio, setEdificio] = useState<string>('');
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        // Cargar todos los anuncios
        const anunciosResp = await fetch(`${baseUrl}/verAnuncios`).then((r) => r.json()).catch(() => []);
        if (cancelado) return;
        // Cargar usuarios y ubicar residente para obtener su Edificio
        const usuariosResp = await fetch(`${baseUrl}/verUsuarios`).then((r) => r.json()).catch(() => []);
        if (cancelado) return;
        const residente = Array.isArray(usuariosResp)
          ? usuariosResp.find((u: any) => (u._id === idResidente) || (u._id?.$oid && u._id.$oid === idResidente))
          : null;
        const edif = residente?.Edificio || '';
        setEdificio(edif);
        // Filtrar anuncios visibles para este residente
        const visibles = Array.isArray(anunciosResp)
          ? anunciosResp.filter((a: any) => a && (a.tipo === 'General' || (a.tipo === 'Edificio' && a.nombreEdificio === edif)))
          : [];
        setAnuncios(visibles);
      } catch {
        setAnuncios([]);
        setEdificio('');
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [idResidente]);

  return (
    <SafeAreaView style={styles.safeArea}>
  <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <ScrollView contentContainerStyle={styles.content}>
        {anuncios.map((anuncio, idx) => (
          <Card key={anuncio._id || idx} style={styles.card}>
            <Card.Title
              title={anuncio.titulo || 'Sin título'}
              subtitle={anuncio.fechaEnvio ? new Date(anuncio.fechaEnvio).toLocaleString() : ''}
              left={(props) => (
                <Avatar.Icon
                  {...props}
                  icon="alert"
                  color="#fff"
                  style={{ backgroundColor: '#e34040ff' }}
                />
              )}
            />
            <Card.Content>
              <Text style={styles.contenido}>{anuncio.contenido}</Text>
              {anuncio.tipo === 'Edificio' && !!anuncio.nombreEdificio && (
                <Text style={styles.edificioLabel}>Solo para: {anuncio.nombreEdificio}</Text>
              )}
            </Card.Content>
          </Card>
        ))}
        {anuncios.length === 0 && (
          <View style={{ paddingTop: 40 }}>
            <Text style={{ color: '#777' }}>No hay anuncios disponibles</Text>
            {edificio ? (
              <Text style={{ color: '#aaa', marginTop: 6 }}>Edificio: {edificio}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  backgroundColor: '#f5f5f5',
  },
  content: {
    flexGrow: 1,
    padding: 20,
  backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 12,
    width: '100%',
    backgroundColor: '#fff',
  },
  contenido: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
  },
  edificioLabel: {
    fontSize: 13,
    color: '#1976d2',
    marginTop: 6,
    fontStyle: 'italic',
  },
});