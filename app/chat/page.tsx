'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { AssistantFormValues } from '@/components/AssistantForm';

export default function ChatPage() {
  const [assistant, setAssistant] = useState<AssistantFormValues | null>(null);

  useEffect(() => {
    // Получаем данные ассистента из localStorage
    const assistantData = localStorage.getItem('currentAssistant');
    if (assistantData) {
      try {
        const parsedAssistant = JSON.parse(assistantData);
        setAssistant(parsedAssistant);
      } catch (error) {
        console.error('Error parsing assistant data:', error);
      }
    }
  }, []);

  if (!assistant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Загрузка чата...</p>
        </div>
      </div>
    );
  }

  return <ChatInterface assistant={assistant} />;
}