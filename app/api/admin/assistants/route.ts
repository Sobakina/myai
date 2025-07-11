import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Получаем все чаты
    const { data: allChats, error: chatsError } = await supabase
      .from('chats')
      .select('*');

    if (chatsError) {
      return NextResponse.json({ error: chatsError }, { status: 400 });
    }

    // Группируем чаты по названию ассистента (извлекаем из title)
    const assistantGroups: Record<string, {
      assistantName: string;
      chatCount: number;
      userCount: number;
      totalMessages: number;
      totalTokens: number;
      firstSeen: string;
      lastSeen: string;
      users: Record<string, {
        fingerprint: string;
        totalMessages: number;
        totalTokens: number;
        firstSeen: string;
        lastSeen: string;
      }>;
    }> = {};

    // Получаем статистику сообщений для всех чатов
    for (const chat of allChats || []) {
      // Извлекаем имя ассистента из title чата (например, "Чат с Claude" -> "Claude")
      const assistantName = chat.title.replace(/^Чат с\s+/, '') || 'Неизвестный ассистент';
      
      if (!assistantGroups[assistantName]) {
        assistantGroups[assistantName] = {
          assistantName,
          chatCount: 0,
          userCount: 0,
          totalMessages: 0,
          totalTokens: 0,
          firstSeen: chat.created_at,
          lastSeen: chat.updated_at,
          users: {}
        };
      }

      assistantGroups[assistantName].chatCount++;

      // Обновляем даты
      if (new Date(chat.created_at) < new Date(assistantGroups[assistantName].firstSeen)) {
        assistantGroups[assistantName].firstSeen = chat.created_at;
      }
      if (new Date(chat.updated_at) > new Date(assistantGroups[assistantName].lastSeen)) {
        assistantGroups[assistantName].lastSeen = chat.updated_at;
      }

      // Группируем пользователей внутри ассистента
      const fingerprint = chat.user_fingerprint;
      if (!assistantGroups[assistantName].users[fingerprint]) {
        assistantGroups[assistantName].users[fingerprint] = {
          fingerprint,
          totalMessages: 0,
          totalTokens: 0,
          firstSeen: chat.created_at,
          lastSeen: chat.updated_at
        };
      }

      // Обновляем даты пользователя
      if (new Date(chat.created_at) < new Date(assistantGroups[assistantName].users[fingerprint].firstSeen)) {
        assistantGroups[assistantName].users[fingerprint].firstSeen = chat.created_at;
      }
      if (new Date(chat.updated_at) > new Date(assistantGroups[assistantName].users[fingerprint].lastSeen)) {
        assistantGroups[assistantName].users[fingerprint].lastSeen = chat.updated_at;
      }

      // Получаем статистику сообщений для чата
      const { data: messages } = await supabase
        .from('messages')
        .select('token_count, system_prompt_tokens')
        .eq('chat_id', chat.id);

      if (messages) {
        const chatTokens = messages.reduce((sum, msg) => 
          sum + (msg.token_count || 0) + (msg.system_prompt_tokens || 0), 0
        );
        
        assistantGroups[assistantName].totalMessages += messages.length;
        assistantGroups[assistantName].totalTokens += chatTokens;
        
        assistantGroups[assistantName].users[fingerprint].totalMessages += messages.length;
        assistantGroups[assistantName].users[fingerprint].totalTokens += chatTokens;
      }
    }

    // Подсчитываем количество уникальных пользователей для каждого ассистента
    Object.keys(assistantGroups).forEach(assistantName => {
      assistantGroups[assistantName].userCount = Object.keys(assistantGroups[assistantName].users).length;
    });

    // Преобразуем в массив и применяем поиск
    let assistants = Object.values(assistantGroups).map(group => ({
      ...group,
      users: Object.values(group.users)
    }));

    if (search) {
      assistants = assistants.filter(assistant => 
        assistant.assistantName.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Сортируем по последней активности
    assistants.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

    // Применяем пагинацию
    const paginatedAssistants = assistants.slice(offset, offset + limit);

    return NextResponse.json({
      assistants: paginatedAssistants,
      pagination: {
        page,
        limit,
        total: assistants.length,
        totalPages: Math.ceil(assistants.length / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching assistants:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}