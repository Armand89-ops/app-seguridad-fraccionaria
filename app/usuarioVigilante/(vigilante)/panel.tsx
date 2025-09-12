import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import PantallaPrincipalVigilante from '../pantallaPrincipalVigilante';

export default function ResidentePanelScreen() {
  const { idVigilante } = useLocalSearchParams<{ idVigilante?: string }>();
  return <PantallaPrincipalVigilante />;
}
