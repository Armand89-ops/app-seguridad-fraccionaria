import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import Pagos from '../pantallaConsultarPagos';

export default function ResidentePagosScreen() {
  const { idVigilante } = useLocalSearchParams<{ idVigilante?: string }>();
  return <Pagos />;
}