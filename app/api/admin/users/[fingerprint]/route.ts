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

    // Обогащаем сообщения информацией о чате
    const enrichedMessages = (allMessages || []).map(msg => ({
      ...msg,
      chat_title: (msg as { chats?: { title?: string } }).chats?.title || 'Неизвестный чат'
    }));

    // Подсчитываем общую статистику
    const userMessages = enrichedMessages.filter(msg => msg.role === 'user');
    const assistantMessages = enrichedMessages.filter(msg => msg.role === 'assistant');
    
    const totalUserTokens = userMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    const totalAssistantTokens = assistantMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    const totalSystemPromptTokens = enrichedMessages.reduce((sum, msg) => sum + (msg.system_prompt_tokens || 0), 0);

    // Получаем статистику для каждого чата (для отображения списка чатов)
    const chatsWithStats = await Promise.all(
      chats.map(async (chat) => {
        const chatMessages = enrichedMessages.filter(msg => msg.chat_id === chat.id);
        const chatUserMessages = chatMessages.filter(msg => msg.role === 'user');
        const chatAssistantMessages = chatMessages.filter(msg => msg.role === 'assistant');
        
        const chatUserTokens = chatUserMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
        const chatAssistantTokens = chatAssistantMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
        const chatSystemTokens = chatMessages.reduce((sum, msg) => sum + (msg.system_prompt_tokens || 0), 0);

        return {
          ...chat,
          messageCount: chatMessages.length,
          userMessages: chatUserMessages.length,
          assistantMessages: chatAssistantMessages.length,
          totalTokens: chatUserTokens + chatAssistantTokens + chatSystemTokens,
          lastMessage: chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null
        };
      })
    );

    const userStats = {
      fingerprint,
      totalChats: chats.length,
      totalMessages: enrichedMessages.length,
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
      chats: chatsWithStats,
      allMessages: enrichedMessages // Объединенная лента всех сообщений
    });
  } catch (err) {
    console.error('Error fetching user details:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}