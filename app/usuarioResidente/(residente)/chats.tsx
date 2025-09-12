import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import Chats from '../pantallaChats';

export default function ResidenteChatsScreen() {
  const { idResidente } = useLocalSearchParams<{ idResidente?: string }>();
  return <Chats />;
}