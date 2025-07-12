import { OpenAI } from 'openai';
import { NextRequest } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});

export async function POST(request: NextRequest) {
  try {
    // Проверяем наличие API ключа в runtime
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-build') {
      return Response.json({ 
        error: 'OpenAI API ключ не настроен', 
        success: false 
      }, { status: 500 });
    }

    const { messages, systemPrompt } = await request.json();

    // Проверяем, что есть сообщения для обработки
    if (!messages || messages.length === 0) {
      return Response.json({ 
        error: 'Нет сообщений для обработки', 
        success: false 
      }, { status: 400 });
    }

    // Проверяем, что есть хотя бы одно сообщение пользователя
    const hasUserMessage = messages.some((msg: any) => msg.role === 'user');
    if (!hasUserMessage) {
      return Response.json({ 
        error: 'Требуется хотя бы одно сообщение пользователя', 
        success: false 
      }, { status: 400 });
    }

    console.log('Chat request:', { 
      messagesCount: messages.length, 
      systemPrompt: systemPrompt?.substring(0, 100) + '...',
      systemPromptTokens: Math.ceil((systemPrompt?.length || 0) / 4),
      apiKeyExists: !!process.env.OPENAI_API_KEY,
      userMessages: messages.filter((msg: any) => msg.role === 'user').length
    });

    // Убеждаемся, что systemPrompt не null/undefined
    const validSystemPrompt = systemPrompt || 'Ты полезный ИИ-ассистент.';
    
    console.log('Creating OpenAI request with:', {
      systemPrompt: validSystemPrompt.substring(0, 50) + '...',
      messagesPreview: messages.map((m: any) => ({ role: m.role, contentLength: m.content?.length || 0 }))
    });

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: validSystemPrompt },
        ...messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content || ''
        }))
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    // Создаем ReadableStream для стриминга
    const encoder = new TextEncoder();
    let totalTokens = 0;
    let assistantTokens = 0;
    let inputTokens = 0;
    
    // Примерно подсчитываем токены system prompt + user message
    const systemPromptTokens = Math.ceil((systemPrompt?.length || 0) / 4);
    const userMessageTokens = Math.ceil((messages[messages.length - 1]?.content?.length || 0) / 4);
    inputTokens = systemPromptTokens + userMessageTokens;
    
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              // Примерный подсчет токенов для стриминга (будет заменен точным в конце)
              assistantTokens += Math.ceil(content.length / 4);
            }
            
            // Проверяем usage в чанке (некоторые версии API возвращают это)
            if (chunk.usage) {
              totalTokens = chunk.usage.total_tokens;
              assistantTokens = chunk.usage.completion_tokens;
              inputTokens = chunk.usage.prompt_tokens;
            }
          }
          
          // Отправляем финальную информацию о токенах
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            tokens: { 
              assistant: assistantTokens,
              input: inputTokens,
              total: totalTokens || (assistantTokens + inputTokens),
              systemPromptTokens: systemPromptTokens
            } 
          })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return Response.json({ 
      error: 'Ошибка при обращении к AI', 
      success: false 
    }, { status: 500 });
  }
}