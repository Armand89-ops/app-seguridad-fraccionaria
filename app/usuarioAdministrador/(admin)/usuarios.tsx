import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import MonitorearUsuarios from '../pantallaMonitorearUsuarios';

export default function AdminPanelScreen() {
  const params = useLocalSearchParams<{ idAdmin?: string }>();
  return <MonitorearUsuarios />;
}