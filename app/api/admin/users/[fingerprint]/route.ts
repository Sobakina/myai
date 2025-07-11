import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ fingerprint: string }> }) {
  try {
    const { fingerprint } = await params;

    // Получаем все чаты пользователя
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .eq('user_fingerprint', fingerprint)
      .order('updated_at', { ascending: false });

    if (chatsError) {
      return NextResponse.json({ error: chatsError }, { status: 400 });
    }

    if (!chats || chats.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chatIds = chats.map(chat => chat.id);

    // Получаем ВСЕ сообщения пользователя из всех чатов
    const { data: allMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*, chats!inner(title)')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return NextResponse.json({ error: messagesError }, { status: 400 });
    }

    // Группируем сообщения по ассистентам
    const assistantGroups: Record<string, {
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
    for (const chat of chats) {
      const assistantName = chat.title.replace(/^Чат с\s+/, '') || 'Неизвестный ассистент';
      const chatMessages = (allMessages || []).filter(msg => msg.chat_id === chat.id);
      
      if (!assistantGroups[assistantName]) {
        assistantGroups[assistantName] = {
          assistantName,
          totalMessages: 0,
          totalUserMessages: 0,
          totalAssistantMessages: 0,
          totalTokens: 0,
          firstSeen: chat.created_at,
          lastSeen: chat.updated_at,
          messages: []
        };
      }

      // Добавляем сообщения
      assistantGroups[assistantName].messages.push(...chatMessages);
      assistantGroups[assistantName].totalMessages += chatMessages.length;
      assistantGroups[assistantName].totalUserMessages += chatMessages.filter(msg => msg.role === 'user').length;
      assistantGroups[assistantName].totalAssistantMessages += chatMessages.filter(msg => msg.role === 'assistant').length;
      assistantGroups[assistantName].totalTokens += chatMessages.reduce((sum, msg) => 
        sum + (msg.token_count || 0) + (msg.system_prompt_tokens || 0), 0
      );

      // Обновляем даты
      if (new Date(chat.created_at) < new Date(assistantGroups[assistantName].firstSeen)) {
        assistantGroups[assistantName].firstSeen = chat.created_at;
      }
      if (new Date(chat.updated_at) > new Date(assistantGroups[assistantName].lastSeen)) {
        assistantGroups[assistantName].lastSeen = chat.updated_at;
      }
    }

    // Сортируем сообщения в каждой группе по времени
    Object.values(assistantGroups).forEach(group => {
      group.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    // Общая статистика пользователя
    const allMessagesFlat = Object.values(assistantGroups).flatMap(group => group.messages);
    const userMessages = allMessagesFlat.filter(msg => msg.role === 'user');
    const assistantMessages = allMessagesFlat.filter(msg => msg.role === 'assistant');

    const totalUserTokens = userMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    const totalAssistantTokens = assistantMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    const totalSystemPromptTokens = allMessagesFlat.reduce((sum, msg) => sum + (msg.system_prompt_tokens || 0), 0);

    const userStats = {
      fingerprint,
      totalChats: chats.length,
      totalMessages: allMessagesFlat.length,
      totalUserMessages: userMessages.length,
      totalAssistantMessages: assistantMessages.length,
      totalTokens: totalUserTokens + totalAssistantTokens + totalSystemPromptTokens,
      firstSeen: chats.reduce((earliest, chat) => 
        new Date(chat.created_at) < new Date(earliest.created_at) ? chat : earliest
      ).created_at,
      lastSeen: chats.reduce((latest, chat) => 
        new Date(chat.updated_at) > new Date(latest.updated_at) ? chat : latest
      ).updated_at
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