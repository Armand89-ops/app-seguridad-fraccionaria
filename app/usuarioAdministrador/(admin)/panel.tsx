import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import PantallaPrincipalAdmin from '../pantallaPrincipalAdmin';

export default function AdminPanelScreen() {
  const params = useLocalSearchParams<{ idAdmin?: string }>();
  return <PantallaPrincipalAdmin />;
}
