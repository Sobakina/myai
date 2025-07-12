'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { AssistantFormValues } from '@/components/AssistantForm';
import { getUserFingerprint } from '@/lib/fingerprint';

interface AssistantPageClientProps {
  assistantId: string;
  initialAssistantData: (AssistantFormValues & { id: string }) | null;
}

export default function AssistantPageClient({ assistantId, initialAssistantData }: AssistantPageClientProps) {
  const [assistant, setAssistant] = useState<AssistantFormValues & { id: string } | null>(null);
  const [userFingerprint, setUserFingerprint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAssistantAndFingerprint() {
      try {
        const fingerprint = await getUserFingerprint();
        
        // Очищаем старые записи currentAssistant (миграция)
        if (localStorage.getItem('currentAssistant')) {
          localStorage.removeItem('currentAssistant');
        }
        
        setUserFingerprint(fingerprint);
        
        // Используем данные с сервера если они есть
        if (initialAssistantData) {
          setAssistant({ ...initialAssistantData, id: assistantId });
          // Сохраняем в localStorage для кеширования
          localStorage.setItem(`assistant_${assistantId}`, JSON.stringify(initialAssistantData));
          setIsLoading(false);
          return;
        }
        
        // Сначала пробуем получить из localStorage для конкретного ассистента
        const assistantData = localStorage.getItem(`assistant_${assistantId}`);
        if (assistantData) {
          try {
            const parsedAssistant = JSON.parse(assistantData);
            setAssistant({ ...parsedAssistant, id: assistantId });
            setIsLoading(false);
            return;
          } catch (error) {
            console.error('Error parsing assistant data from localStorage:', error);
          }
        }

        // Если ничего нет, загружаем с сервера
        const response = await fetch(`/api/assistants/${assistantId}`);
        if (response.ok) {
          const assistantData = await response.json();
          setAssistant(assistantData);
          // Сохраняем в localStorage для конкретного ассистента
          localStorage.setItem(`assistant_${assistantId}`, JSON.stringify(assistantData));
        } else {
          console.error('Failed to load assistant');
        }
      } catch (error) {
        console.error('Error loading assistant:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAssistantAndFingerprint();
  }, [assistantId, initialAssistantData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Загрузка ассистента...</p>
        </div>
      </div>
    );
  }

  if (!assistant || !userFingerprint || !assistantId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <p className="text-red-400">Ассистент не найден</p>
        </div>
      </div>
    );
  }

  return (
    <ChatInterface 
      assistant={assistant} 
      assistantId={assistantId}
      userFingerprint={userFingerprint}
    />
  );
}