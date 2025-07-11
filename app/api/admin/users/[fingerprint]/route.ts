import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ fingerprint: string }> }) {
  try {
    const { fingerprint } = await params;

    // Получаем все сообщения пользователя
    const { data: allMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('user_fingerprint', fingerprint)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return NextResponse.json({ error: messagesError }, { status: 400 });
    }

    if (!allMessages || allMessages.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Получаем данные ассистентов
    const { data: assistantsData, error: assistantsError } = await supabase
      .from('assistants')
      .select('id, name');

    if (assistantsError) {
      return NextResponse.json({ error: assistantsError }, { status: 400 });
    }

    // Создаем мапу ассистентов для быстрого поиска
    const assistantsMap = new Map(assistantsData?.map(a => [a.id, a.name]) || []);

    // Группируем сообщения по ассистентам
    const assistantGroups: Record<string, {
      assistantId: string;
      assistantName: string;
      totalMessages: number;
      totalUserMessages: number;
      totalAssistantMessages: number;
      totalTokens: number;
      firstSeen: string;
      lastSeen: string;
      messages: typeof allMessages;
    }> = {};

    // Группируем сообщения по ассистентам
    for (const message of allMessages) {
      const assistantId = message.assistant_id;
      const assistantName = assistantsMap.get(assistantId) || 'Неизвестный ассистент';
      
      if (!assistantGroups[assistantId]) {
        assistantGroups[assistantId] = {
          assistantId,
          assistantName,
          totalMessages: 0,
          totalUserMessages: 0,
          totalAssistantMessages: 0,
          totalTokens: 0,
          firstSeen: message.created_at,
          lastSeen: message.created_at,
          messages: []
        };
      }

      // Добавляем сообщение
      assistantGroups[assistantId].messages.push(message);
      assistantGroups[assistantId].totalMessages++;
      
      if (message.role === 'user') {
        assistantGroups[assistantId].totalUserMessages++;
      } else if (message.role === 'assistant') {
        assistantGroups[assistantId].totalAssistantMessages++;
      }
      
      assistantGroups[assistantId].totalTokens += (message.token_count || 0) + (message.system_prompt_tokens || 0);

      // Обновляем даты
      if (new Date(message.created_at) < new Date(assistantGroups[assistantId].firstSeen)) {
        assistantGroups[assistantId].firstSeen = message.created_at;
      }
      if (new Date(message.created_at) > new Date(assistantGroups[assistantId].lastSeen)) {
        assistantGroups[assistantId].lastSeen = message.created_at;
      }
    }

    // Общая статистика пользователя
    const userMessages = allMessages.filter(msg => msg.role === 'user');
    const assistantMessages = allMessages.filter(msg => msg.role === 'assistant');

    const totalUserTokens = userMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    const totalAssistantTokens = assistantMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    const totalSystemPromptTokens = allMessages.reduce((sum, msg) => sum + (msg.system_prompt_tokens || 0), 0);

    const userStats = {
      fingerprint,
      totalConversations: Object.keys(assistantGroups).length,
      totalMessages: allMessages.length,
      totalUserMessages: userMessages.length,
      totalAssistantMessages: assistantMessages.length,
      totalTokens: totalUserTokens + totalAssistantTokens + totalSystemPromptTokens,
      firstSeen: allMessages[0]?.created_at,
      lastSeen: allMessages[allMessages.length - 1]?.created_at
    };

    return NextResponse.json({
      userStats,
      assistants: Object.values(assistantGroups).sort((a, b) => 
        new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
      )
    });
  } catch (err) {
    console.error('Error fetching user details:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}