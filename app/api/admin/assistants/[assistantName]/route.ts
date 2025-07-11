import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ assistantName: string }> }) {
  try {
    const { assistantName } = await params;
    const decodedAssistantName = decodeURIComponent(assistantName);

    // Найдем ассистента по имени
    const { data: assistantData, error: assistantError } = await supabase
      .from('assistants')
      .select('id, name')
      .ilike('name', decodedAssistantName)
      .single();

    if (assistantError || !assistantData) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 });
    }

    // Получаем все сообщения данного ассистента
    const { data: allMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('assistant_id', assistantData.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return NextResponse.json({ error: messagesError }, { status: 400 });
    }

    // Группируем по пользователям
    const userGroups: Record<string, {
      fingerprint: string;
      totalMessages: number;
      totalUserMessages: number;
      totalAssistantMessages: number;
      totalTokens: number;
      firstSeen: string;
      lastSeen: string;
      messages: typeof allMessages;
    }> = {};

    // Добавляем сообщения к соответствующим пользователям
    (allMessages || []).forEach(msg => {
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
      assistantName: assistantData.name,
      totalConversations: Object.keys(userGroups).length,
      totalUsers: Object.keys(userGroups).length,
      totalMessages: allMessages?.length || 0,
      totalUserMessages: (allMessages || []).filter(msg => msg.role === 'user').length,
      totalAssistantMessages: (allMessages || []).filter(msg => msg.role === 'assistant').length,
      totalTokens: (allMessages || []).reduce((sum, msg) => 
        sum + (msg.token_count || 0) + (msg.system_prompt_tokens || 0), 0
      ),
      firstSeen: allMessages?.[0]?.created_at || new Date().toISOString(),
      lastSeen: allMessages?.[allMessages.length - 1]?.created_at || new Date().toISOString()
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