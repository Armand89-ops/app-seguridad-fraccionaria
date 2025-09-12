import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import ReglamentoUnidad from '../pantallaReglamentoUnidad';

export default function ResidenteReglamentoScreen() {
  const { idVigilante } = useLocalSearchParams<{ idVigilante?: string }>();
  return <ReglamentoUnidad />;
}