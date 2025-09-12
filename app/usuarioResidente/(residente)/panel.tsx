import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import PantallaPrincipalResidente from '../pantallaPrincipalResidente';

export default function ResidentePanelScreen() {
  const { idResidente } = useLocalSearchParams<{ idResidente?: string }>();
  // Inner screen reads param via useLocalSearchParams; this ensures the param exists
  return <PantallaPrincipalResidente />;
}
