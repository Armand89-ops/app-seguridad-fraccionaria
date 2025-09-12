import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import Anuncios from '../pantallaAnuncios';

export default function ResidenteAnunciosScreen() {
  const { idResidente } = useLocalSearchParams<{ idResidente?: string }>();
  return <Anuncios />;
}