import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Получаем всех пользователей (группировка по fingerprint)
    let query = supabase
      .from('chats')
      .select('user_fingerprint, created_at, updated_at');

    if (search) {
      query = query.ilike('user_fingerprint', `%${search}%`);
    }

    const { data: allChats, error } = await query;

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Группируем по fingerprint
    const userGroups: Record<string, {
      fingerprint: string;
      chatCount: number;
      firstSeen: string;
      lastSeen: string;
      totalMessages: number;
      totalTokens: number;
    }> = {};

    // Получаем статистику для каждого пользователя
    for (const chat of allChats || []) {
      const fingerprint = chat.user_fingerprint;
      
      if (!userGroups[fingerprint]) {
        userGroups[fingerprint] = {
          fingerprint,
          chatCount: 0,
          firstSeen: chat.created_at,
          lastSeen: chat.updated_at,
          totalMessages: 0,
          totalTokens: 0
        };
      }

      userGroups[fingerprint].chatCount++;
      
      // Обновляем даты
      if (new Date(chat.created_at) < new Date(userGroups[fingerprint].firstSeen)) {
        userGroups[fingerprint].firstSeen = chat.created_at;
      }
      if (new Date(chat.updated_at) > new Date(userGroups[fingerprint].lastSeen)) {
        userGroups[fingerprint].lastSeen = chat.updated_at;
      }
    }

    // Получаем статистику сообщений для каждого пользователя
    for (const fingerprint of Object.keys(userGroups)) {
      // Получаем все чаты пользователя
      const { data: userChats } = await supabase
        .from('chats')
        .select('id')
        .eq('user_fingerprint', fingerprint);

      if (userChats) {
        const chatIds = userChats.map(chat => chat.id);
        
        // Получаем статистику сообщений
        const { data: messages } = await supabase
          .from('messages')
          .select('token_count, system_prompt_tokens')
          .in('chat_id', chatIds);

        if (messages) {
          userGroups[fingerprint].totalMessages = messages.length;
          userGroups[fingerprint].totalTokens = messages.reduce((sum, msg) => 
            sum + (msg.token_count || 0) + (msg.system_prompt_tokens || 0), 0
          );
        }
      }
    }

    // Преобразуем в массив и сортируем
    const users = Object.values(userGroups)
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

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