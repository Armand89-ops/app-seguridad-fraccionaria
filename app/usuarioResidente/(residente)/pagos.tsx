import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import Pagos from '../pantallaHistorialPagos';

export default function ResidentePagosScreen() {
  const { idResidente } = useLocalSearchParams<{ idResidente?: string }>();
  return <Pagos />;
}