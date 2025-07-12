import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Получаем все сообщения
    const { data: allMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*');

    if (messagesError) {
      return NextResponse.json({ error: messagesError }, { status: 400 });
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

    // Обрабатываем все сообщения
    for (const message of allMessages || []) {
      const assistantId = message.assistant_id;
      const assistantName = assistantsMap.get(assistantId) || 'Неизвестный ассистент';
      
      if (!assistantGroups[assistantId]) {
        assistantGroups[assistantId] = {
          assistantId,
          assistantName,
          userCount: 0,
          totalMessages: 0,
          totalTokens: 0,
          firstSeen: message.created_at,
          lastSeen: message.created_at,
          users: {}
        };
      }

      // Обновляем даты
      if (new Date(message.created_at) < new Date(assistantGroups[assistantId].firstSeen)) {
        assistantGroups[assistantId].firstSeen = message.created_at;
      }
      if (new Date(message.created_at) > new Date(assistantGroups[assistantId].lastSeen)) {
        assistantGroups[assistantId].lastSeen = message.created_at;
      }

      // Группируем пользователей внутри ассистента
      const fingerprint = message.user_fingerprint;
      if (!assistantGroups[assistantId].users[fingerprint]) {
        assistantGroups[assistantId].users[fingerprint] = {
          fingerprint,
          totalMessages: 0,
          totalTokens: 0,
          firstSeen: message.created_at,
          lastSeen: message.created_at
        };
      }

      // Обновляем даты пользователя
      if (new Date(message.created_at) < new Date(assistantGroups[assistantId].users[fingerprint].firstSeen)) {
        assistantGroups[assistantId].users[fingerprint].firstSeen = message.created_at;
      }
      if (new Date(message.created_at) > new Date(assistantGroups[assistantId].users[fingerprint].lastSeen)) {
        assistantGroups[assistantId].users[fingerprint].lastSeen = message.created_at;
      }

      // Подсчитываем токены и сообщения
      const messageTokens = (message.token_count || 0) + (message.system_prompt_tokens || 0);
      
      assistantGroups[assistantId].totalMessages++;
      assistantGroups[assistantId].totalTokens += messageTokens;
      
      assistantGroups[assistantId].users[fingerprint].totalMessages++;
      assistantGroups[assistantId].users[fingerprint].totalTokens += messageTokens;
    }

    // Подсчитываем количество уникальных пользователей для каждого ассистента
    Object.keys(assistantGroups).forEach(assistantId => {
      assistantGroups[assistantId].userCount = Object.keys(assistantGroups[assistantId].users).length;
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