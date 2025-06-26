import { OpenAI } from 'openai';
import { NextRequest } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt } = await request.json();

    console.log('Chat request:', { 
      messagesCount: messages.length, 
      systemPrompt: systemPrompt?.substring(0, 100) + '...',
      systemPromptTokens: Math.ceil((systemPrompt?.length || 0) / 4),
      apiKeyExists: !!process.env.OPENAI_API_KEY 
    });

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
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