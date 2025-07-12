'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatInterface } from '@/components/ChatInterface';
import { AssistantFormValues } from '@/components/AssistantForm';
import { getUserFingerprint } from '@/lib/fingerprint';

interface AssistantPageClientProps {
  assistantId: string;
  initialAssistantData: (AssistantFormValues & { id: string }) | null;
}

export default function AssistantPageClient({ assistantId, initialAssistantData }: AssistantPageClientProps) {
  const searchParams = useSearchParams();
  const [assistant, setAssistant] = useState<AssistantFormValues & { id: string } | null>(null);
  const [userFingerprint, setUserFingerprint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  // Обработка URL параметра welcome
  useEffect(() => {
    const welcomeParam = searchParams.get('welcome');
    if (welcomeParam) {
      setWelcomeMessage(decodeURIComponent(welcomeParam));
      // Очищаем URL от параметра после получения
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

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

  // Сохраняем приветственное сообщение когда все данные загружены
  useEffect(() => {
    async function saveWelcomeMessage() {
      if (welcomeMessage && userFingerprint && assistantId) {
        try {
          const response = await fetch('/api/welcome-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              assistantId,
              userFingerprint,
              welcomeMessage
            }),
          });

          if (response.ok) {
            console.log('Welcome message saved successfully');
            // Очищаем welcomeMessage после сохранения
            setWelcomeMessage(null);
            // Принудительно обновляем страницу чтобы новое сообщение появилось
            window.location.reload();
          } else {
            const errorData = await response.text();
            console.error('Failed to save welcome message:', response.status, errorData);
          }
        } catch (error) {
          console.error('Error saving welcome message:', error);
        }
      }
    }

    saveWelcomeMessage();
  }, [welcomeMessage, userFingerprint, assistantId]);

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