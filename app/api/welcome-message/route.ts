import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assistantId, userFingerprint, welcomeMessage } = body;

    if (!assistantId || !userFingerprint || !welcomeMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Проверяем, существует ли уже такое приветственное сообщение
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('assistant_id', assistantId)
      .eq('user_fingerprint', userFingerprint)
      .eq('content', welcomeMessage)
      .eq('role', 'assistant')
      .limit(1);

    // Если сообщение уже существует, не добавляем его повторно
    if (existingMessages && existingMessages.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Welcome message already exists'
      });
    }

    // Создаем уникальный UUID для приветственного сообщения
    const welcomeMessageId = uuidv4();

    // Сохраняем приветственное сообщение в БД как сообщение от ассистента
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          id: welcomeMessageId,
          assistant_id: assistantId,
          user_fingerprint: userFingerprint,
          content: welcomeMessage,
          role: 'assistant',
          token_count: 0,
          system_prompt_tokens: 0
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving welcome message:', error);
      return NextResponse.json({ error: 'Failed to save welcome message' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: data
    });
  } catch (err) {
    console.error('Welcome message API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}