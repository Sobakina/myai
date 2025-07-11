import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', params.chatId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { chatId: string } }) {
  try {
    const body = await req.json();
    const { content, role, tokenCount, systemPromptTokens } = body;

    if (!content || !role) {
      return NextResponse.json({ 
        error: 'content and role are required' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: params.chatId,
          content,
          role,
          token_count: tokenCount || 0,
          system_prompt_tokens: systemPromptTokens || 0,
        }
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Обновляем время последнего обновления чата
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.chatId);

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}