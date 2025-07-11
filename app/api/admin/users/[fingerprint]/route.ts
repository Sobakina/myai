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

    // Получаем статистику для каждого чата
    const chatsWithStats = await Promise.all(
      chats.map(async (chat) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('id, role, token_count, system_prompt_tokens, created_at')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false });

        const userMessages = messages?.filter(msg => msg.role === 'user') || [];
        const assistantMessages = messages?.filter(msg => msg.role === 'assistant') || [];
        
        const totalUserTokens = userMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
        const totalAssistantTokens = assistantMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
        const totalSystemPromptTokens = messages?.reduce((sum, msg) => sum + (msg.system_prompt_tokens || 0), 0) || 0;

        return {
          ...chat,
          messageCount: messages?.length || 0,
          userMessages: userMessages.length,
          assistantMessages: assistantMessages.length,
          totalTokens: totalUserTokens + totalAssistantTokens + totalSystemPromptTokens,
          lastMessage: messages?.[0] || null
        };
      })
    );

    // Общая статистика пользователя
    const totalMessages = chatsWithStats.reduce((sum, chat) => sum + chat.messageCount, 0);
    const totalTokens = chatsWithStats.reduce((sum, chat) => sum + chat.totalTokens, 0);
    const totalUserMessages = chatsWithStats.reduce((sum, chat) => sum + chat.userMessages, 0);
    const totalAssistantMessages = chatsWithStats.reduce((sum, chat) => sum + chat.assistantMessages, 0);

    const userStats = {
      fingerprint,
      totalChats: chats.length,
      totalMessages,
      totalUserMessages,
      totalAssistantMessages,
      totalTokens,
      firstSeen: chats.reduce((earliest, chat) => 
        new Date(chat.created_at) < new Date(earliest.created_at) ? chat : earliest
      ).created_at,
      lastSeen: chats.reduce((latest, chat) => 
        new Date(chat.updated_at) > new Date(latest.updated_at) ? chat : latest
      ).updated_at
    };

    return NextResponse.json({
      userStats,
      chats: chatsWithStats
    });
  } catch (err) {
    console.error('Error fetching user details:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}