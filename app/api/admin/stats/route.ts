import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Общая статистика чатов
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('id, created_at, updated_at');

    if (chatsError) {
      return NextResponse.json({ error: chatsError }, { status: 400 });
    }

    // Общая статистика сообщений
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('id, role, token_count, system_prompt_tokens, created_at, chat_id');

    if (messagesError) {
      return NextResponse.json({ error: messagesError }, { status: 400 });
    }

    // Подсчет статистики
    const totalChats = chatsData?.length || 0;
    const totalMessages = messagesData?.length || 0;
    
    const userMessages = messagesData?.filter(msg => msg.role === 'user') || [];
    const assistantMessages = messagesData?.filter(msg => msg.role === 'assistant') || [];
    
    const totalUserTokens = userMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    const totalAssistantTokens = assistantMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    const totalSystemPromptTokens = messagesData?.reduce((sum, msg) => sum + (msg.system_prompt_tokens || 0), 0) || 0;

    // Статистика по дням (последние 7 дней)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayChats = chatsData?.filter(chat => 
        chat.created_at.startsWith(dateStr)
      ).length || 0;
      
      const dayMessages = messagesData?.filter(msg => 
        msg.created_at.startsWith(dateStr)
      ).length || 0;
      
      dailyStats.push({
        date: dateStr,
        chats: dayChats,
        messages: dayMessages
      });
    }

    // Топ активных чатов
    const chatActivity: Record<string, number> = {};
    messagesData?.forEach(msg => {
      if (!chatActivity[msg.chat_id]) {
        chatActivity[msg.chat_id] = 0;
      }
      chatActivity[msg.chat_id]++;
    });

    const topChats = Object.entries(chatActivity)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([chatId, messageCount]) => ({
        chatId,
        messageCount: messageCount as number
      }));

    const stats = {
      overview: {
        totalChats,
        totalMessages,
        totalUserMessages: userMessages.length,
        totalAssistantMessages: assistantMessages.length,
        totalUserTokens,
        totalAssistantTokens,
        totalSystemPromptTokens,
        totalTokens: totalUserTokens + totalAssistantTokens + totalSystemPromptTokens
      },
      dailyStats,
      topChats,
      recentActivity: {
        chatsLastWeek: chatsData?.filter(chat => 
          new Date(chat.created_at) >= sevenDaysAgo
        ).length || 0,
        messagesLastWeek: messagesData?.filter(msg => 
          new Date(msg.created_at) >= sevenDaysAgo
        ).length || 0
      }
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}