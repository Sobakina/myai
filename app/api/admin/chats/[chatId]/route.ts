import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const { chatId } = await params;

    // Получаем информацию о чате
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();

    if (chatError) {
      return NextResponse.json({ error: chatError }, { status: 400 });
    }

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Получаем все сообщения чата
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return NextResponse.json({ error: messagesError }, { status: 400 });
    }

    // Подсчитываем статистику
    const userMessages = messages?.filter(msg => msg.role === 'user') || [];
    const assistantMessages = messages?.filter(msg => msg.role === 'assistant') || [];
    
    const totalUserTokens = userMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    const totalAssistantTokens = assistantMessages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
    const totalSystemPromptTokens = messages?.reduce((sum, msg) => sum + (msg.system_prompt_tokens || 0), 0) || 0;

    const stats = {
      totalMessages: messages?.length || 0,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      totalUserTokens,
      totalAssistantTokens,
      totalSystemPromptTokens,
      totalTokens: totalUserTokens + totalAssistantTokens + totalSystemPromptTokens,
      duration: chat.updated_at && chat.created_at 
        ? new Date(chat.updated_at).getTime() - new Date(chat.created_at).getTime()
        : 0
    };

    return NextResponse.json({
      chat,
      messages: messages || [],
      stats
    });
  } catch (err) {
    console.error('Error fetching chat details:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}