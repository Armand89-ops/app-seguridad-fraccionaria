import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import Chats from '../pantallaChats';

export default function VigilanteChatsScreen() {
  const { idVigilante } = useLocalSearchParams<{ idVigilante?: string }>();
  return <Chats />;
}