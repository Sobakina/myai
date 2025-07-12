import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import AssistantPageClient from './AssistantPageClient';

// Функция для генерации динамической metadata
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    
    // Получаем данные ассистента с сервера
    const { data, error } = await supabase
      .from('assistants')
      .select('name, description')
      .eq('id', id)
      .single();

    if (error || !data) {
      return {
        title: "Assist",
        description: "Кастомный AI-ассистент",
      };
    }

    return {
      title: data.name,
      description: data.description || `Чат с ассистентом ${data.name}`,
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: "Assist",
      description: "Кастомный AI-ассистент",
    };
  }
}

export default async function AssistantChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Получаем данные ассистента для передачи в клиент
  let assistantData = null;
  try {
    const { data, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', id)
      .single();
    
    if (!error && data) {
      assistantData = data;
    }
  } catch (error) {
    console.error('Error loading assistant data:', error);
  }

  return <AssistantPageClient assistantId={id} initialAssistantData={assistantData} />;
}