import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userFingerprint = searchParams.get('userFingerprint');

    if (!userFingerprint) {
      return NextResponse.json({ error: 'userFingerprint is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('chats')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        assistants (
          id,
          name,
          description
        )
      `)
      .eq('user_fingerprint', userFingerprint)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userFingerprint, assistantId, title } = body;

    if (!userFingerprint) {
      return NextResponse.json({ 
        error: 'userFingerprint is required' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('chats')
      .insert([
        {
          user_fingerprint: userFingerprint,
          assistant_id: assistantId,
          title: title || 'Новый чат',
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