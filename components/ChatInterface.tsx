'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AssistantFormValues } from './AssistantForm';
import { countTokens } from '@/lib/tokenCounter';
import { calculateCost, formatCost } from '@/lib/pricing';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { getUserFingerprint } from '@/lib/fingerprint';

export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  tokenCount?: number;
  systemPromptTokens?: number;
};

interface ChatInterfaceProps {
  assistant: AssistantFormValues;
  chatId?: string;
}

export function ChatInterface({ assistant, chatId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    error: speechError
  } = useSpeechRecognition();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  const createNewChat = useCallback(async (fingerprint: string) => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFingerprint: fingerprint,
          assistantId: null,
          title: `Чат с ${assistant.name}`,
        }),
      });
      
      if (response.ok) {
        const newChat = await response.json();
        setCurrentChatId(newChat.id);
        
        const welcomeMessage: Message = {
          id: '1',
          content: `Привет! Я ${assistant.name}. ${assistant.description}. Чем могу помочь?`,
          role: 'assistant',
          timestamp: new Date(),
          tokenCount: countTokens(`Привет! Я ${assistant.name}. ${assistant.description}. Чем могу помочь?`),
        };
        
        setMessages([welcomeMessage]);
        await saveMessage(newChat.id, welcomeMessage);
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  }, [assistant.name, assistant.description]);

  useEffect(() => {
    async function initializeChat() {
      const fingerprint = await getUserFingerprint();
      
      if (currentChatId) {
        await loadChatMessages(currentChatId);
      } else {
        await createNewChat(fingerprint);
      }
    }
    
    initializeChat();
  }, [currentChatId, createNewChat]);

  const loadChatMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const chatMessages = await response.json();
        const formattedMessages: Message[] = chatMessages.map((msg: {
          id: string;
          content: string;
          role: 'user' | 'assistant';
          created_at: string;
          token_count?: number;
          system_prompt_tokens?: number;
        }) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: new Date(msg.created_at),
          tokenCount: msg.token_count,
          systemPromptTokens: msg.system_prompt_tokens,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const saveMessage = async (chatId: string, message: Message) => {
    try {
      await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message.content,
          role: message.role,
          tokenCount: message.tokenCount,
          systemPromptTokens: message.systemPromptTokens,
        }),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
      tokenCount: countTokens(inputValue),
      systemPromptTokens: countTokens(assistant.systemPrompt),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    if (currentChatId) {
      await saveMessage(currentChatId, userMessage);
    }

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      tokenCount: 0,
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const allMessages = [...messages, userMessage];
      const recentMessages = allMessages.slice(-5);
      const apiMessages = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt: assistant.systemPrompt
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Response error:', { status: response.status, text: errorText });
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let finalContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  finalContent += parsed.content;
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { 
                            ...msg, 
                            content: msg.content + parsed.content,
                            tokenCount: countTokens(msg.content + parsed.content)
                          }
                        : msg
                    )
                  );
                } else if (parsed.tokens) {
                  setMessages(prev => 
                    prev.map(msg => {
                      if (msg.id === assistantMessageId) {
                        return { ...msg, tokenCount: parsed.tokens.assistant };
                      }
                      if (msg.role === 'user' && msg.id === userMessage.id) {
                        return { 
                          ...msg, 
                          tokenCount: parsed.tokens.input - (parsed.tokens.systemPromptTokens || 0),
                          systemPromptTokens: parsed.tokens.systemPromptTokens 
                        };
                      }
                      return msg;
                    })
                  );
                }
              } catch {
                // Игнорируем ошибки парсинга
              }
            }
          }
        }
      }
      
      if (currentChatId && finalContent) {
        const finalAssistantMessage: Message = {
          id: assistantMessageId,
          content: finalContent,
          role: 'assistant',
          timestamp: new Date(),
          tokenCount: countTokens(finalContent),
        };
        await saveMessage(currentChatId, finalAssistantMessage);
      }
    } catch (error) {
      console.error('Chat API error:', error);
      const errorText = 'Извините, произошла ошибка при обращении к AI. Попробуйте еще раз.';
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: errorText, tokenCount: countTokens(errorText) }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[97vh] bg-zinc-950">
      <div className="bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-white">{assistant.name}</h1>
          <p className="text-zinc-400 text-sm">{assistant.description}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                <p className="text-sm">
                  {message.content}
                  {message.role === 'assistant' && isLoading && message.content === '' && (
                    <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-1"></span>
                  )}
                </p>
                <div className="flex justify-between items-center mt-1 text-xs opacity-70">
                  <span>
                    {message.timestamp.toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="ml-2">
                    {message.role === 'user' 
                      ? formatCost(
                          calculateCost((message.tokenCount || 0) + (message.systemPromptTokens || 0), 'input')
                        )
                      : formatCost(calculateCost(message.tokenCount || 0, 'output'))
                    }
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-zinc-900 border-t border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto">
          {speechError && (
            <div className="mb-2 text-red-400 text-sm text-center">
              {speechError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Пишите или нажмите на микрофон..."
                className="w-full bg-zinc-800 text-white placeholder-zinc-400 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] max-h-[200px] overflow-y-auto"
                disabled={isLoading}
                rows={1}
                style={{
                  height: 'auto'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                }}
              />
            </div>
            <div className="flex space-x-3">
              {isSupported && (
                <button
                  type="button"
                  onMouseDown={() => !isLoading && startListening()}
                  onMouseUp={stopListening}
                  onMouseLeave={stopListening}
                  onTouchStart={() => !isLoading && startListening()}
                  onTouchEnd={stopListening}
                  className={`px-4 py-3 rounded-xl font-medium transition-colors select-none ${
                    isListening 
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                      : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                  }`}
                  disabled={isLoading}
                >
                  <svg 
                    className="w-4 h-4 mr-2 inline" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                  {isListening ? 'Слушаю...' : 'Удерживайте'}
                </button>
              )}
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Отправить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}