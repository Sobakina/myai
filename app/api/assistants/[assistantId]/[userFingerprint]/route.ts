import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ assistantId: string; userFingerprint: string }> }
) {
  try {
    const { assistantId, userFingerprint } = await params;
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('assistant_id', assistantId)
      .eq('user_fingerprint', userFingerprint)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ assistantId: string; userFingerprint: string }> }
) {
  try {
    const { assistantId, userFingerprint } = await params;
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
          assistant_id: assistantId,
          user_fingerprint: userFingerprint,
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

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ assistantId: string; userFingerprint: string }> }
) {
  try {
    const { assistantId, userFingerprint } = await params;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('assistant_id', assistantId)
      .eq('user_fingerprint', userFingerprint);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}