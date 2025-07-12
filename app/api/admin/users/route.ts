import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Получаем все сообщения для группировки по пользователям
    const { data: allMessages, error } = await supabase
      .from('messages')
      .select('user_fingerprint, assistant_id, created_at, token_count, system_prompt_tokens');

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Группируем по fingerprint
    const userGroups: Record<string, {
      fingerprint: string;
      conversationCount: number;
      assistantCount: number;
      firstSeen: string;
      lastSeen: string;
      totalMessages: number;
      totalTokens: number;
      assistants: Set<string>;
    }> = {};

    // Получаем статистику для каждого пользователя
    for (const message of allMessages || []) {
      const fingerprint = message.user_fingerprint;
      
      if (!userGroups[fingerprint]) {
        userGroups[fingerprint] = {
          fingerprint,
          conversationCount: 0,
          assistantCount: 0,
          firstSeen: message.created_at,
          lastSeen: message.created_at,
          totalMessages: 0,
          totalTokens: 0,
          assistants: new Set()
        };
      }

      userGroups[fingerprint].totalMessages++;
      userGroups[fingerprint].totalTokens += (message.token_count || 0) + (message.system_prompt_tokens || 0);
      userGroups[fingerprint].assistants.add(message.assistant_id);
      
      // Обновляем даты
      if (new Date(message.created_at) < new Date(userGroups[fingerprint].firstSeen)) {
        userGroups[fingerprint].firstSeen = message.created_at;
      }
      if (new Date(message.created_at) > new Date(userGroups[fingerprint].lastSeen)) {
        userGroups[fingerprint].lastSeen = message.created_at;
      }
    }

    // Подсчитываем количество разговоров и ассистентов
    Object.keys(userGroups).forEach(fingerprint => {
      userGroups[fingerprint].assistantCount = userGroups[fingerprint].assistants.size;
      userGroups[fingerprint].conversationCount = userGroups[fingerprint].assistants.size; // Каждый ассистент = один разговор с этим пользователем
    });

    // Преобразуем в массив и применяем поиск
    let users = Object.values(userGroups).map(group => ({
      fingerprint: group.fingerprint,
      conversationCount: group.conversationCount,
      assistantCount: group.assistantCount,
      firstSeen: group.firstSeen,
      lastSeen: group.lastSeen,
      totalMessages: group.totalMessages,
      totalTokens: group.totalTokens
    }));

    if (search) {
      users = users.filter(user => 
        user.fingerprint.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Сортируем по последней активности
    users.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

    // Применяем пагинацию
    const paginatedUsers = users.slice(offset, offset + limit);

    return NextResponse.json({
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total: users.length,
        totalPages: Math.ceil(users.length / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}