'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChatInterface } from '@/components/ChatInterface';
import { AssistantFormValues } from '@/components/AssistantForm';

export default function AssistantChatPage() {
  const params = useParams();
  const [assistant, setAssistant] = useState<AssistantFormValues & { id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAssistant() {
      try {
        const assistantId = params?.id as string;
        
        // Сначала пробуем получить из localStorage
        const assistantData = localStorage.getItem('currentAssistant');
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

        // Если в localStorage нет, загружаем с сервера
        const response = await fetch(`/api/assistants/${assistantId}`);
        if (response.ok) {
          const assistantData = await response.json();
          setAssistant(assistantData);
          // Сохраняем в localStorage для будущих использований
          localStorage.setItem('currentAssistant', JSON.stringify(assistantData));
        } else {
          console.error('Failed to load assistant');
        }
      } catch (error) {
        console.error('Error loading assistant:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (params?.id) {
      loadAssistant();
    }
  }, [params?.id]);

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

  if (!assistant) {
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
      assistantId={params?.id as string}
      userFingerprint={params?.userFingerprint as string}
    />
  );
}