import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import ReglamentoUnidad from '../pantallaReglamentoUnidad';

export default function AdminPanelScreen() {
  const params = useLocalSearchParams<{ idAdmin?: string }>();
  return <ReglamentoUnidad />;
}