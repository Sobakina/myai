'use client';

import React, { useState, useEffect } from 'react';

interface AdminStats {
  overview: {
    totalChats: number;
    totalMessages: number;
    totalUserMessages: number;
    totalAssistantMessages: number;
    totalUserTokens: number;
    totalAssistantTokens: number;
    totalSystemPromptTokens: number;
    totalTokens: number;
  };
  dailyStats: {
    date: string;
    chats: number;
    messages: number;
  }[];
  topChats: {
    chatId: string;
    messageCount: number;
  }[];
  recentActivity: {
    chatsLastWeek: number;
    messagesLastWeek: number;
  };
}


interface User {
  fingerprint: string;
  chatCount: number;
  firstSeen: string;
  lastSeen: string;
  totalMessages: number;
  totalTokens: number;
}

interface UserDetails {
  userStats: {
    fingerprint: string;
    totalChats: number;
    totalMessages: number;
    totalUserMessages: number;
    totalAssistantMessages: number;
    totalTokens: number;
    firstSeen: string;
    lastSeen: string;
  };
  chats: {
    id: string;
    title: string;
    user_fingerprint: string;
    created_at: string;
    updated_at: string;
    messageCount: number;
    userMessages: number;
    assistantMessages: number;
    totalTokens: number;
    lastMessage: {
      id: string;
      role: string;
      created_at: string;
    } | null;
  }[];
  allMessages: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    token_count: number;
    system_prompt_tokens: number;
    created_at: string;
    chat_id: string;
    chat_title: string;
  }[];
}


export default function AdminPage() {
  const [currentView, setCurrentView] = useState<'stats' | 'users' | 'user-detail'>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (currentView === 'stats') {
      fetchStats();
    } else if (currentView === 'users') {
      fetchUsers();
    }
  }, [currentView, currentPage, searchTerm]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке статистики');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm
      });
      
      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) {
        throw new Error('Ошибка при загрузке пользователей');
      }
      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };


  const fetchUserDetails = async (fingerprint: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${fingerprint}`);
      if (!response.ok) {
        throw new Error('Ошибка при загрузке деталей пользователя');
      }
      const data = await response.json();
      setSelectedUser(data);
      setCurrentView('user-detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Ошибка: {error}</p>
          <button 
            onClick={() => {
              setError(null);
              if (currentView === 'stats') fetchStats();
              else if (currentView === 'users') fetchUsers();
            }}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Навигация */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex space-x-4">
            <h1 className="text-3xl font-bold">Админ панель</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentView('stats')}
                className={`px-4 py-2 rounded transition-colors ${
                  currentView === 'stats' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              >
                Статистика
              </button>
              <button
                onClick={() => setCurrentView('users')}
                className={`px-4 py-2 rounded transition-colors ${
                  currentView === 'users' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              >
                Логи чатов
              </button>
            </div>
          </div>
          
          {currentView === 'user-detail' && (
            <button
              onClick={() => setCurrentView('users')}
              className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded transition-colors"
            >
              ← Назад к пользователям
            </button>
          )}
        </div>

        {/* Контент статистики */}
        {currentView === 'stats' && stats && (
          <div>
            <div className="flex justify-end mb-4">
              <button 
                onClick={fetchStats}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
              >
                Обновить
              </button>
            </div>

            {/* Общая статистика */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-zinc-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Всего чатов</h3>
                <p className="text-3xl font-bold text-blue-400">{stats.overview.totalChats}</p>
              </div>
              <div className="bg-zinc-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Всего сообщений</h3>
                <p className="text-3xl font-bold text-green-400">{stats.overview.totalMessages}</p>
              </div>
              <div className="bg-zinc-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Всего токенов</h3>
                <p className="text-3xl font-bold text-purple-400">{stats.overview.totalTokens.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Активность (неделя)</h3>
                <p className="text-xl font-bold text-orange-400">
                  {stats.recentActivity.chatsLastWeek} чатов
                </p>
                <p className="text-sm text-zinc-400">
                  {stats.recentActivity.messagesLastWeek} сообщений
                </p>
              </div>
            </div>

            {/* Детализированная статистика */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-zinc-800 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Статистика сообщений</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Пользовательские:</span>
                    <span className="font-semibold">{stats.overview.totalUserMessages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>От ассистентов:</span>
                    <span className="font-semibold">{stats.overview.totalAssistantMessages}</span>
                  </div>
                  <hr className="border-zinc-600" />
                  <div className="flex justify-between">
                    <span>Токены пользователей:</span>
                    <span className="font-semibold">{stats.overview.totalUserTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Токены ассистентов:</span>
                    <span className="font-semibold">{stats.overview.totalAssistantTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Системные токены:</span>
                    <span className="font-semibold">{stats.overview.totalSystemPromptTokens.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Топ активных чатов</h3>
                <div className="space-y-2">
                  {stats.topChats.slice(0, 8).map((chat, index) => (
                    <div key={chat.chatId} className="flex justify-between items-center">
                      <span className="text-zinc-300">
                        #{index + 1} {chat.chatId.slice(0, 8)}...
                      </span>
                      <span className="font-semibold">{chat.messageCount} сообщений</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Активность по дням */}
            <div className="bg-zinc-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Активность за последние 7 дней</h3>
              <div className="space-y-4">
                {stats.dailyStats.map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <span className="w-24">{new Date(day.date).toLocaleDateString('ru-RU')}</span>
                    <div className="flex-1 mx-4">
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <div className="bg-zinc-600 h-4 rounded">
                            <div 
                              className="bg-blue-500 h-4 rounded" 
                              style={{ 
                                width: `${Math.min(100, (day.chats / Math.max(...stats.dailyStats.map(d => d.chats))) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-zinc-400">Чаты: {day.chats}</span>
                        </div>
                        <div className="flex-1">
                          <div className="bg-zinc-600 h-4 rounded">
                            <div 
                              className="bg-green-500 h-4 rounded" 
                              style={{ 
                                width: `${Math.min(100, (day.messages / Math.max(...stats.dailyStats.map(d => d.messages))) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-zinc-400">Сообщения: {day.messages}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Список пользователей */}
        {currentView === 'users' && (
          <div>
            {/* Поиск */}
            <div className="mb-6">
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  placeholder="Поиск по fingerprint..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-600 focus:border-blue-500"
                />
                <button
                  onClick={fetchUsers}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
                >
                  Обновить
                </button>
              </div>
            </div>

            {/* Таблица пользователей */}
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-700">
                  <tr>
                    <th className="text-left p-4">Fingerprint</th>
                    <th className="text-left p-4">Чатов</th>
                    <th className="text-left p-4">Сообщений</th>
                    <th className="text-left p-4">Токенов</th>
                    <th className="text-left p-4">Первое посещение</th>
                    <th className="text-left p-4">Последняя активность</th>
                    <th className="text-left p-4">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.fingerprint} className="border-t border-zinc-600 hover:bg-zinc-700">
                      <td className="p-4 font-mono text-sm">{user.fingerprint.slice(0, 4)}...</td>
                      <td className="p-4">{user.chatCount}</td>
                      <td className="p-4">{user.totalMessages}</td>
                      <td className="p-4">{user.totalTokens.toLocaleString()}</td>
                      <td className="p-4 text-sm text-zinc-400">
                        {new Date(user.firstSeen).toLocaleString('ru-RU')}
                      </td>
                      <td className="p-4 text-sm text-zinc-400">
                        {new Date(user.lastSeen).toLocaleString('ru-RU')}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => fetchUserDetails(user.fingerprint)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
                        >
                          Просмотр
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded"
                >
                  ←
                </button>
                <span className="px-3 py-1">
                  {currentPage} из {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Детали пользователя */}
        {currentView === 'user-detail' && selectedUser && (
          <div>
            {/* Информация о пользователе */}
            <div className="bg-zinc-800 p-6 rounded-lg mb-6">
              <h2 className="text-2xl font-bold mb-4">Пользователь {selectedUser.userStats.fingerprint.slice(0, 4)}...</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-zinc-400">Fingerprint</p>
                  <p className="font-mono text-sm">{selectedUser.userStats.fingerprint.slice(0, 4)}...</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Всего чатов</p>
                  <p className="text-lg font-bold">{selectedUser.userStats.totalChats}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Первое посещение</p>
                  <p className="text-sm">{new Date(selectedUser.userStats.firstSeen).toLocaleString('ru-RU')}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Последняя активность</p>
                  <p className="text-sm">{new Date(selectedUser.userStats.lastSeen).toLocaleString('ru-RU')}</p>
                </div>
              </div>
            </div>

            {/* Статистика пользователя */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">Всего сообщений</p>
                <p className="text-2xl font-bold">{selectedUser.userStats.totalMessages}</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">От пользователя</p>
                <p className="text-2xl font-bold text-blue-400">{selectedUser.userStats.totalUserMessages}</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">От ассистентов</p>
                <p className="text-2xl font-bold text-green-400">{selectedUser.userStats.totalAssistantMessages}</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">Всего токенов</p>
                <p className="text-2xl font-bold text-purple-400">{selectedUser.userStats.totalTokens.toLocaleString()}</p>
              </div>
            </div>

            {/* Объединенная лента сообщений */}
            <div className="bg-zinc-800 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-bold mb-4">Все сообщения пользователя ({selectedUser.allMessages.length})</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedUser.allMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md p-4 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-blue-900/30 border-l-4 border-blue-500' 
                          : 'bg-green-900/30 border-l-4 border-green-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-3">
                          <span className={`font-semibold ${
                            message.role === 'user' ? 'text-blue-400' : 'text-green-400'
                          }`}>
                            {message.role === 'user' ? 'Пользователь' : 'Ассистент'}
                          </span>
                          <span className="text-xs bg-zinc-700 px-2 py-1 rounded">
                            {message.chat_title}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 text-right ml-2">
                          <div>{new Date(message.created_at).toLocaleString('ru-RU')}</div>
                          <div>Токены: {message.token_count || 0}</div>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Статистика по чатам */}
            <div className="bg-zinc-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Статистика по чатам ({selectedUser.chats.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedUser.chats.map((chat) => (
                  <div key={chat.id} className="bg-zinc-700 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">{chat.title}</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Сообщений:</span>
                        <span>{chat.messageCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Пользователя:</span>
                        <span className="text-blue-400">{chat.userMessages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Ассистента:</span>
                        <span className="text-green-400">{chat.assistantMessages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Токенов:</span>
                        <span>{chat.totalTokens.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Создан:</span>
                        <span>{new Date(chat.created_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}