'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AssistantFormValues } from './AssistantForm';
import { countTokens } from '@/lib/tokenCounter';
import { calculateCost, formatCost } from '@/lib/pricing';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  tokenCount?: number;
  systemPromptTokens?: number;
};

interface ChatInterfaceProps {
  assistant: AssistantFormValues & {
    systemPrompt?: string;
    system_prompt?: string; // для совместимости с БД
  };
  assistantId: string;
  userFingerprint: string;
}

export function ChatInterface({ assistant, assistantId, userFingerprint }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
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

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleShareConfirm = async () => {
    try {
      let shareUrl = `${window.location.origin}/assistants/${assistantId}`;
      
      // Если есть приветственное сообщение, добавляем его в URL
      if (shareMessage.trim()) {
        const encodedMessage = encodeURIComponent(shareMessage.trim());
        shareUrl += `?welcome=${encodedMessage}`;
      }
      
      await navigator.clipboard.writeText(shareUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
      setShowShareModal(false);
      setShareMessage('');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback для старых браузеров
      let shareUrl = `${window.location.origin}/assistants/${assistantId}`;
      if (shareMessage.trim()) {
        const encodedMessage = encodeURIComponent(shareMessage.trim());
        shareUrl += `?welcome=${encodedMessage}`;
      }
      
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
      setShowShareModal(false);
      setShareMessage('');
    }
  };

  const handleShareCancel = () => {
    setShowShareModal(false);
    setShareMessage('');
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  const initializeChat = useCallback(async () => {
    if (isInitializing || isInitialized) return;
    
    setIsInitializing(true);
    try {
      console.log('Initializing chat for:', { assistantId, userFingerprint });
      
      // Загружаем существующие сообщения
      const response = await fetch(`/api/assistants/${assistantId}/${userFingerprint}`);
      
      console.log('Messages API response:', { 
        status: response.status, 
        ok: response.ok 
      });
      
      if (response.ok) {
        const chatMessages = await response.json();
        
        // Отображаем сообщения (или пустой массив если их нет)
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
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing chat:', error);
      setIsInitialized(true);
    } finally {
      setIsInitializing(false);
    }
  }, [assistantId, userFingerprint, isInitialized, isInitializing]);

  // Сбрасываем состояние при смене ассистента или пользователя
  useEffect(() => {
    setIsInitialized(false);
    setIsInitializing(false);
    setMessages([]);
  }, [assistantId, userFingerprint]);

  useEffect(() => {
    if (!isInitialized && !isInitializing && assistantId && userFingerprint) {
      initializeChat();
    }
  }, [assistantId, userFingerprint, isInitialized, isInitializing, initializeChat]);


  const saveMessage = async (message: Message) => {
    try {
      const response = await fetch(`/api/assistants/${assistantId}/${userFingerprint}`, {
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
      
      // Если получили ошибку дублирования, просто игнорируем её
      if (!response.ok) {
        const errorText = await response.text();
        // Проверяем, является ли это ошибкой уникальности
        if (errorText.includes('duplicate') || errorText.includes('unique') || errorText.includes('already exists')) {
          console.log('Message already exists, skipping save');
          return;
        }
        throw new Error(`Failed to save message: ${errorText}`);
      }
    } catch (error) {
      // Игнорируем ошибки дублирования, логируем остальные
      if (error instanceof Error && 
          (error.message.includes('duplicate') || 
           error.message.includes('unique') || 
           error.message.includes('already exists'))) {
        console.log('Message already exists, skipping save');
      } else {
        console.error('Error saving message:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    console.log('Assistant data:', {
      systemPrompt: assistant.systemPrompt,
      system_prompt: assistant.system_prompt,
      hasSystemPrompt: !!(assistant.systemPrompt || assistant.system_prompt)
    });

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
      tokenCount: countTokens(inputValue),
      systemPromptTokens: countTokens(assistant.systemPrompt || assistant.system_prompt || ''),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    await saveMessage(userMessage);

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
      // Фильтруем UI-only сообщения для отправки в API
      const realMessages = messages.filter(msg => msg.id !== 'welcome-ui-only');
      const allMessages = [...realMessages, userMessage];
      const recentMessages = allMessages.slice(-5);
      
      // Если у пользователя нет предыдущих сообщений (новый разговор), 
      // отправляем только текущее сообщение пользователя
      const apiMessages = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      console.log('Sending to API:', { 
        realMessagesCount: realMessages.length,
        apiMessagesCount: apiMessages.length,
        apiMessages: apiMessages
      });
      
      // Убеждаемся, что есть хотя бы одно сообщение пользователя
      if (apiMessages.length === 0 || !apiMessages.some(msg => msg.role === 'user')) {
        console.error('No user messages to send to API');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt: assistant.systemPrompt || assistant.system_prompt
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
      
      if (finalContent) {
        const finalAssistantMessage: Message = {
          id: assistantMessageId,
          content: finalContent,
          role: 'assistant',
          timestamp: new Date(),
          tokenCount: countTokens(finalContent),
        };
        await saveMessage(finalAssistantMessage);
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
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{assistant.name}</h1>
              <p className="text-zinc-400 text-sm">{assistant.description}</p>
            </div>
            <div className="relative">
              <button
                onClick={handleShare}
                className="ml-4 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors flex items-center space-x-2"
                title="Поделиться ссылкой на чат"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span className="text-sm">Поделиться</span>
              </button>
              {shareSuccess && (
                <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg shadow-lg">
                  Ссылка скопирована!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-sm px-4 py-3 rounded-2xl ${
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
        <div className="max-w-2xl mx-auto">
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
                onKeyDown={(e) => {
                  if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
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

      {/* Модальное окно для поделиться */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Поделиться чатом</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Добавьте приветственное сообщение (необязательно), которое увидит получатель при открытии чата:
            </p>
            <textarea
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              placeholder="Например: Привет! Попробуй этого ассистента, он очень полезный..."
              className="w-full bg-zinc-700 text-white placeholder-zinc-400 rounded-lg p-3 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              maxLength={500}
            />
            <div className="text-xs text-zinc-500 mb-4">
              {shareMessage.length}/500 символов
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleShareCancel}
                className="flex-1 bg-zinc-600 hover:bg-zinc-500 text-white py-2 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleShareConfirm}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
              >
                Скопировать ссылку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}