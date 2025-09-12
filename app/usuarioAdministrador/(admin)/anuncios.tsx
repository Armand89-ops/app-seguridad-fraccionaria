import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import Anuncios from '../pantallaEnvioAnuncios';

export default function AdminPanelScreen() {
  const params = useLocalSearchParams<{ idAdmin?: string }>();
  return <Anuncios />;
}