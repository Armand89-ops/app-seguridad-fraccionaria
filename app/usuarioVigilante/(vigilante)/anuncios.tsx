import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import Alertas from '../pantallaAlertas';

export default function ResidenteAlertasScreen() {
  const { idVigilante } = useLocalSearchParams<{ idVigilante?: string }>();
  return <Alertas />;
}