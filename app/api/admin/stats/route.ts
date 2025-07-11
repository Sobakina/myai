import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Общая статистика сообщений (теперь без чатов)
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('id, role, token_count, system_prompt_tokens, created_at, assistant_id, user_fingerprint');

    if (messagesError) {
      return NextResponse.json({ error: messagesError }, { status: 400 });
    }

    // Подсчет уникальных "чатов" (комбинаций assistant_id + user_fingerprint)
    const uniqueConversations = new Set();
    messagesData?.forEach(msg => {
      uniqueConversations.add(`${msg.assistant_id}-${msg.user_fingerprint}`);
    });

    const totalConversations = uniqueConversations.size;
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
      
      const dayMessages = messagesData?.filter(msg => 
        msg.created_at.startsWith(dateStr)
      ).length || 0;

      // Подсчет уникальных разговоров за день
      const dayConversations = new Set();
      messagesData?.filter(msg => msg.created_at.startsWith(dateStr))
        .forEach(msg => {
          dayConversations.add(`${msg.assistant_id}-${msg.user_fingerprint}`);
        });
      
      dailyStats.push({
        date: dateStr,
        conversations: dayConversations.size,
        messages: dayMessages
      });
    }

    // Топ активных разговоров (assistant_id + user_fingerprint)
    const conversationActivity: Record<string, number> = {};
    messagesData?.forEach(msg => {
      const conversationKey = `${msg.assistant_id}-${msg.user_fingerprint}`;
      if (!conversationActivity[conversationKey]) {
        conversationActivity[conversationKey] = 0;
      }
      conversationActivity[conversationKey]++;
    });

    const topConversations = Object.entries(conversationActivity)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([conversationKey, messageCount]) => {
        const [assistantId, userFingerprint] = conversationKey.split('-');
        return {
          assistantId,
          userFingerprint,
          messageCount: messageCount as number
        };
      });

    const stats = {
      overview: {
        totalConversations,
        totalMessages,
        totalUserMessages: userMessages.length,
        totalAssistantMessages: assistantMessages.length,
        totalUserTokens,
        totalAssistantTokens,
        totalSystemPromptTokens,
        totalTokens: totalUserTokens + totalAssistantTokens + totalSystemPromptTokens
      },
      dailyStats,
      topConversations,
      recentActivity: {
        conversationsLastWeek: (() => {
          const weekConversations = new Set();
          messagesData?.filter(msg => 
            new Date(msg.created_at) >= sevenDaysAgo
          ).forEach(msg => {
            weekConversations.add(`${msg.assistant_id}-${msg.user_fingerprint}`);
          });
          return weekConversations.size;
        })(),
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