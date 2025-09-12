import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import Pagos from '../pantallaModuloPagos';

export default function AdminPanelScreen() {
  const params = useLocalSearchParams<{ idAdmin?: string }>();
  return <Pagos />;
}