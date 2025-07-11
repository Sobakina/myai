import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Запрос чатов с поиском
    let query = supabase
      .from('chats')
      .select(`
        id,
        title,
        user_fingerprint,
        created_at,
        updated_at,
        messages:messages(count)
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order(sortBy, { ascending: sortOrder === 'asc' });

    if (search) {
      query = query.or(`title.ilike.%${search}%,user_fingerprint.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const { data: chats, error, count } = await query;

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Получаем количество сообщений для каждого чата
    const chatsWithStats = await Promise.all(
      (chats || []).map(async (chat) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('id, role, token_count, created_at')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const { data: messageCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', chat.id);

        return {
          ...chat,
          messageCount: messageCount?.length || 0,
          lastMessage: messages?.[0] || null
        };
      })
    );

    return NextResponse.json({
      chats: chatsWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching chats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}