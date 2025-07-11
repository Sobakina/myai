import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ assistantName: string }> }) {
  try {
    const { assistantName } = await params;
    const decodedAssistantName = decodeURIComponent(assistantName);

    // Получаем все чаты данного ассистента
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .ilike('title', `%${decodedAssistantName}%`)
      .order('updated_at', { ascending: false });

    if (chatsError) {
      return NextResponse.json({ error: chatsError }, { status: 400 });
    }

    if (!chats || chats.length === 0) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }

    const chatIds = chats.map(chat => chat.id);

    // Получаем ВСЕ сообщения всех чатов ассистента
    const { data: allMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*, chats!inner(title, user_fingerprint)')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return NextResponse.json({ error: messagesError }, { status: 400 });
    }

    // Обогащаем сообщения информацией о пользователе
    const enrichedMessages = (allMessages || []).map(msg => ({
      ...msg,
      user_fingerprint: (msg as { chats?: { user_fingerprint?: string } }).chats?.user_fingerprint || 'unknown'
    }));

    // Группируем по пользователям
    const userGroups: Record<string, {
      fingerprint: string;
      totalMessages: number;
      totalUserMessages: number;
      totalAssistantMessages: number;
      totalTokens: number;
      firstSeen: string;
      lastSeen: string;
      messages: typeof enrichedMessages;
    }> = {};

    // Добавляем сообщения к соответствующим пользователям
    enrichedMessages.forEach(msg => {
      const fingerprint = msg.user_fingerprint;
      if (!userGroups[fingerprint]) {
        userGroups[fingerprint] = {
          fingerprint,
          totalMessages: 0,
          totalUserMessages: 0,
          totalAssistantMessages: 0,
          totalTokens: 0,
          firstSeen: msg.created_at,
          lastSeen: msg.created_at,
          messages: []
        };
      }

      userGroups[fingerprint].messages.push(msg);
      userGroups[fingerprint].totalMessages++;
      
      if (msg.role === 'user') {
        userGroups[fingerprint].totalUserMessages++;
      } else {
        userGroups[fingerprint].totalAssistantMessages++;
      }
      
      userGroups[fingerprint].totalTokens += (msg.token_count || 0) + (msg.system_prompt_tokens || 0);

      // Обновляем даты
      if (new Date(msg.created_at) < new Date(userGroups[fingerprint].firstSeen)) {
        userGroups[fingerprint].firstSeen = msg.created_at;
      }
      if (new Date(msg.created_at) > new Date(userGroups[fingerprint].lastSeen)) {
        userGroups[fingerprint].lastSeen = msg.created_at;
      }
    });

    // Общая статистика ассистента
    const assistantStats = {
      assistantName: decodedAssistantName,
      totalChats: chats.length,
      totalUsers: Object.keys(userGroups).length,
      totalMessages: enrichedMessages.length,
      totalUserMessages: enrichedMessages.filter(msg => msg.role === 'user').length,
      totalAssistantMessages: enrichedMessages.filter(msg => msg.role === 'assistant').length,
      totalTokens: enrichedMessages.reduce((sum, msg) => 
        sum + (msg.token_count || 0) + (msg.system_prompt_tokens || 0), 0
      ),
      firstSeen: chats.reduce((earliest, chat) => 
        new Date(chat.created_at) < new Date(earliest.created_at) ? chat : earliest
      ).created_at,
      lastSeen: chats.reduce((latest, chat) => 
        new Date(chat.updated_at) > new Date(latest.updated_at) ? chat : latest
      ).updated_at
    };

    return NextResponse.json({
      assistantStats,
      users: Object.values(userGroups).sort((a, b) => 
        new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
      )
    });
  } catch (err) {
    console.error('Error fetching assistant details:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}