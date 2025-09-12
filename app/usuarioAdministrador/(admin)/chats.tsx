import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import Chats from '../pantallaMonitoreoChats';

export default function AdminPanelScreen() {
  const params = useLocalSearchParams<{ idAdmin?: string }>();
  return <Chats />;
}