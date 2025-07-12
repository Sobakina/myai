'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AdminStats {
  overview: {
    totalAssistants: number;
    totalUsers: number;
    totalConversations: number;
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
    conversations: number;
    messages: number;
  }[];
  topConversations: {
    assistantId: string;
    userFingerprint: string;
    messageCount: number;
  }[];
  recentActivity: {
    conversationsLastWeek: number;
    messagesLastWeek: number;
  };
}


interface User {
  fingerprint: string;
  conversationCount: number;
  assistantCount: number;
  firstSeen: string;
  lastSeen: string;
  totalMessages: number;
  totalTokens: number;
}

interface Assistant {
  assistantId: string;
  assistantName: string;
  userCount: number;
  totalMessages: number;
  totalTokens: number;
  firstSeen: string;
  lastSeen: string;
  users: {
    fingerprint: string;
    totalMessages: number;
    totalTokens: number;
    firstSeen: string;
    lastSeen: string;
  }[];
}

interface AssistantDetails {
  assistantStats: {
    assistantName: string;
    totalUsers: number;
    totalMessages: number;
    totalUserMessages: number;
    totalAssistantMessages: number;
    totalTokens: number;
    firstSeen: string;
    lastSeen: string;
  };
  users: {
    fingerprint: string;
    totalMessages: number;
    totalUserMessages: number;
    totalAssistantMessages: number;
    totalTokens: number;
    firstSeen: string;
    lastSeen: string;
    messages: {
      id: string;
      content: string;
      role: 'user' | 'assistant';
      token_count: number;
      system_prompt_tokens: number;
      created_at: string;
      assistant_id: string;
      user_fingerprint: string;
    }[];
  }[];
}

interface UserDetails {
  userStats: {
    fingerprint: string;
    totalConversations: number;
    totalMessages: number;
    totalUserMessages: number;
    totalAssistantMessages: number;
    totalTokens: number;
    firstSeen: string;
    lastSeen: string;
  };
  assistants: {
    assistantId: string;
    assistantName: string;
    totalMessages: number;
    totalUserMessages: number;
    totalAssistantMessages: number;
    totalTokens: number;
    firstSeen: string;
    lastSeen: string;
    messages: {
      id: string;
      content: string;
      role: 'user' | 'assistant';
      token_count: number;
      system_prompt_tokens: number;
      created_at: string;
      assistant_id: string;
      user_fingerprint: string;
    }[];
  }[];
}


export default function AdminPage() {
  const [currentView, setCurrentView] = useState<'stats' | 'assistants' | 'users' | 'user-detail' | 'user-assistant-detail' | 'assistant-detail' | 'assistant-user-detail'>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [selectedUserAssistant, setSelectedUserAssistant] = useState<UserDetails['assistants'][0] | null>(null);
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantDetails | null>(null);
  const [selectedAssistantUser, setSelectedAssistantUser] = useState<AssistantDetails['users'][0] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  const fetchAssistants = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm
      });
      
      const response = await fetch(`/api/admin/assistants?${params}`);
      if (!response.ok) {
        throw new Error('Ошибка при загрузке ассистентов');
      }
      const data = await response.json();
      setAssistants(data.assistants);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  const fetchUsers = useCallback(async () => {
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
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (currentView === 'stats') {
      fetchStats();
    } else if (currentView === 'assistants') {
      fetchAssistants();
    } else if (currentView === 'users') {
      fetchUsers();
    }
  }, [currentView, currentPage, searchTerm, fetchAssistants, fetchUsers]);


  const fetchAssistantDetails = async (assistantName: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/assistants/${encodeURIComponent(assistantName)}`);
      if (!response.ok) {
        throw new Error('Ошибка при загрузке деталей ассистента');
      }
      const data = await response.json();
      setSelectedAssistant(data);
      setCurrentView('assistant-detail');
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

  const selectAssistantUser = (user: AssistantDetails['users'][0]) => {
    setSelectedAssistantUser(user);
    setCurrentView('assistant-user-detail');
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
              else if (currentView === 'assistants') fetchAssistants();
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
                onClick={() => setCurrentView('assistants')}
                className={`px-4 py-2 rounded transition-colors ${
                  currentView === 'assistants' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              >
                По ассистентам
              </button>
              <button
                onClick={() => setCurrentView('users')}
                className={`px-4 py-2 rounded transition-colors ${
                  currentView === 'users' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              >
                По пользователям
              </button>
            </div>
          </div>
          
          {currentView === 'assistant-detail' && (
            <button
              onClick={() => setCurrentView('assistants')}
              className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded transition-colors"
            >
              ← Назад к ассистентам
            </button>
          )}
          {currentView === 'assistant-user-detail' && (
            <button
              onClick={() => setCurrentView('assistant-detail')}
              className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded transition-colors"
            >
              ← Назад к ассистенту
            </button>
          )}
          {currentView === 'user-detail' && (
            <button
              onClick={() => setCurrentView('users')}
              className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded transition-colors"
            >
              ← Назад к пользователям
            </button>
          )}
          {currentView === 'user-assistant-detail' && (
            <button
              onClick={() => setCurrentView('user-detail')}
              className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded transition-colors"
            >
              ← Назад к пользователю
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-zinc-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Всего ассистентов</h3>
                <p className="text-3xl font-bold text-green-400">{stats.overview.totalAssistants}</p>
              </div>
              <div className="bg-zinc-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Всего пользователей</h3>
                <p className="text-3xl font-bold text-purple-400">{stats.overview.totalUsers}</p>
              </div>
              <div className="bg-zinc-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Всего разговоров</h3>
                <p className="text-3xl font-bold text-blue-400">{stats.overview.totalConversations}</p>
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
                  {stats.recentActivity.conversationsLastWeek} разговоров
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
                <h3 className="text-xl font-semibold mb-4">Топ активных разговоров</h3>
                <div className="space-y-2">
                  {stats.topConversations.slice(0, 8).map((conversation, index) => (
                    <div key={`conversation-${index}-${conversation.assistantId}-${conversation.userFingerprint}`} className="flex justify-between items-center">
                      <span className="text-zinc-300">
                        #{index + 1} {conversation.assistantId.slice(0, 8)}... / {conversation.userFingerprint.slice(0, 4)}...
                      </span>
                      <span className="font-semibold">{conversation.messageCount} сообщений</span>
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
                                width: `${Math.min(100, (day.conversations / Math.max(...stats.dailyStats.map(d => d.conversations))) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-zinc-400">Разговоры: {day.conversations}</span>
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

        {/* Список ассистентов */}
        {currentView === 'assistants' && (
          <div>
            {/* Поиск */}
            <div className="mb-6">
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  placeholder="Поиск по имени ассистента..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 bg-zinc-800 text-white px-4 py-2 rounded border border-zinc-600 focus:border-blue-500"
                />
                <button
                  onClick={fetchAssistants}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
                >
                  Обновить
                </button>
              </div>
            </div>

            {/* Таблица ассистентов */}
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-700">
                  <tr>
                    <th className="text-left p-4">Ассистент</th>
                    <th className="text-left p-4">Пользователей</th>
                    <th className="text-left p-4">Сообщений</th>
                    <th className="text-left p-4">Токенов</th>
                    <th className="text-left p-4">Первое использование</th>
                    <th className="text-left p-4">Последняя активность</th>
                    <th className="text-left p-4">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {assistants
                    .sort((a, b) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime())
                    .map((assistant) => (
                    <tr key={assistant.assistantId || assistant.assistantName} className="border-t border-zinc-600 hover:bg-zinc-700">
                      <td className="p-4 font-semibold">{assistant.assistantName}</td>
                      <td className="p-4">{assistant.userCount}</td>
                      <td className="p-4">{assistant.totalMessages}</td>
                      <td className="p-4">{assistant.totalTokens.toLocaleString()}</td>
                      <td className="p-4 text-sm text-zinc-400">
                        {new Date(assistant.firstSeen).toLocaleString('ru-RU')}
                      </td>
                      <td className="p-4 text-sm text-zinc-400">
                        {new Date(assistant.lastSeen).toLocaleString('ru-RU')}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => fetchAssistantDetails(assistant.assistantName)}
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
                    <th className="text-left p-4">Пользователь</th>
                    <th className="text-left p-4">Разговоров</th>
                    <th className="text-left p-4">Сообщений</th>
                    <th className="text-left p-4">Токенов</th>
                    <th className="text-left p-4">Первое посещение</th>
                    <th className="text-left p-4">Последняя активность</th>
                    <th className="text-left p-4">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .sort((a, b) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime())
                    .map((user) => (
                    <tr key={user.fingerprint} className="border-t border-zinc-600 hover:bg-zinc-700">
                      <td className="p-4 font-mono text-sm">{user.fingerprint.slice(0, 4)}...</td>
                      <td className="p-4">{user.conversationCount}</td>
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
                  <p className="text-sm text-zinc-400">Всего разговоров</p>
                  <p className="text-lg font-bold">{selectedUser.userStats.totalConversations}</p>
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

            {/* Список ассистентов пользователя */}
            <div className="bg-zinc-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Ассистенты с которыми общался пользователь ({selectedUser.assistants.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedUser.assistants.map((assistant) => (
                  <div key={assistant.assistantId || assistant.assistantName} className="bg-zinc-700 p-4 rounded-lg hover:bg-zinc-600 transition-colors cursor-pointer"
                       onClick={() => {
                         setSelectedUserAssistant(assistant);
                         setCurrentView('user-assistant-detail');
                       }}>
                    <h4 className="font-semibold mb-2">{assistant.assistantName}</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Сообщений:</span>
                        <span>{assistant.totalMessages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Пользователя:</span>
                        <span className="text-blue-400">{assistant.totalUserMessages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Ассистента:</span>
                        <span className="text-green-400">{assistant.totalAssistantMessages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Токенов:</span>
                        <span>{assistant.totalTokens.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Первое общение:</span>
                        <span>{new Date(assistant.firstSeen).toLocaleDateString('ru-RU')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Последнее общение:</span>
                        <span>{new Date(assistant.lastSeen).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Диалог пользователя с ассистентом */}
        {currentView === 'user-assistant-detail' && selectedUser && selectedUserAssistant && (
          <div>
            {/* Информация о диалоге */}
            <div className="bg-zinc-800 p-6 rounded-lg mb-6">
              <h2 className="text-2xl font-bold mb-4">
                Диалог пользователя {selectedUser.userStats.fingerprint.slice(0, 4)}... с {selectedUserAssistant.assistantName}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-zinc-400">Всего сообщений</p>
                  <p className="text-lg font-bold">{selectedUserAssistant.totalMessages}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">От пользователя</p>
                  <p className="text-lg font-bold text-blue-400">{selectedUserAssistant.totalUserMessages}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">От ассистента</p>
                  <p className="text-lg font-bold text-green-400">{selectedUserAssistant.totalAssistantMessages}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Всего токенов</p>
                  <p className="text-lg font-bold text-purple-400">{selectedUserAssistant.totalTokens.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Лента сообщений */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-zinc-800 rounded-lg">
                <h3 className="text-xl font-bold mb-4 pt-6 mx-6">Сообщения ({selectedUserAssistant.messages.length})</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pb-6 mx-6 custom-scrollbar">
                {selectedUserAssistant.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-sm p-4 rounded-lg ${
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
            </div>
          </div>
        )}

        {/* Детали ассистента */}
        {currentView === 'assistant-detail' && selectedAssistant && (
          <div>
            {/* Информация об ассистенте */}
            <div className="bg-zinc-800 p-6 rounded-lg mb-6">
              <h2 className="text-2xl font-bold mb-4">Ассистент {selectedAssistant.assistantStats.assistantName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-zinc-400">Пользователей</p>
                  <p className="text-lg font-bold">{selectedAssistant.assistantStats.totalUsers}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Первое использование</p>
                  <p className="text-sm">{new Date(selectedAssistant.assistantStats.firstSeen).toLocaleString('ru-RU')}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Последняя активность</p>
                  <p className="text-sm">{new Date(selectedAssistant.assistantStats.lastSeen).toLocaleString('ru-RU')}</p>
                </div>
              </div>
            </div>

            {/* Статистика ассистента */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">Всего сообщений</p>
                <p className="text-2xl font-bold">{selectedAssistant.assistantStats.totalMessages}</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">От пользователей</p>
                <p className="text-2xl font-bold text-blue-400">{selectedAssistant.assistantStats.totalUserMessages}</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">От ассистента</p>
                <p className="text-2xl font-bold text-green-400">{selectedAssistant.assistantStats.totalAssistantMessages}</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">Всего токенов</p>
                <p className="text-2xl font-bold text-purple-400">{selectedAssistant.assistantStats.totalTokens.toLocaleString()}</p>
              </div>
            </div>

            {/* Пользователи ассистента */}
            <div className="bg-zinc-800 p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Пользователи ассистента ({selectedAssistant.users.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedAssistant.users.map((user) => (
                  <div key={user.fingerprint} className="bg-zinc-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm">{user.fingerprint.slice(0, 4)}...</h4>
                      <button
                        onClick={() => selectAssistantUser(user)}
                        className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs transition-colors"
                      >
                        Открыть
                      </button>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Сообщений:</span>
                        <span>{user.totalMessages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Пользователя:</span>
                        <span className="text-blue-400">{user.totalUserMessages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Ассистента:</span>
                        <span className="text-green-400">{user.totalAssistantMessages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Токенов:</span>
                        <span>{user.totalTokens.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Последнее сообщение:</span>
                        <span>{new Date(user.lastSeen).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Детали пользователя в контексте ассистента */}
        {currentView === 'assistant-user-detail' && selectedAssistantUser && (
          <div>
            {/* Информация о пользователе */}
            <div className="bg-zinc-800 p-6 rounded-lg mb-6">
              <h2 className="text-2xl font-bold mb-4">Пользователь {selectedAssistantUser.fingerprint.slice(0, 4)}... у {selectedAssistant?.assistantStats.assistantName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-zinc-400">Fingerprint</p>
                  <p className="font-mono text-sm">{selectedAssistantUser.fingerprint.slice(0, 4)}...</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Первый чат</p>
                  <p className="text-sm">{new Date(selectedAssistantUser.firstSeen).toLocaleString('ru-RU')}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Последняя активность</p>
                  <p className="text-sm">{new Date(selectedAssistantUser.lastSeen).toLocaleString('ru-RU')}</p>
                </div>
              </div>
            </div>

            {/* Статистика пользователя */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">Всего сообщений</p>
                <p className="text-2xl font-bold">{selectedAssistantUser.totalMessages}</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">От пользователя</p>
                <p className="text-2xl font-bold text-blue-400">{selectedAssistantUser.totalUserMessages}</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">От ассистента</p>
                <p className="text-2xl font-bold text-green-400">{selectedAssistantUser.totalAssistantMessages}</p>
              </div>
              <div className="bg-zinc-800 p-4 rounded-lg">
                <p className="text-sm text-zinc-400">Всего токенов</p>
                <p className="text-2xl font-bold text-purple-400">{selectedAssistantUser.totalTokens.toLocaleString()}</p>
              </div>
            </div>

            {/* Объединенная лента сообщений */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-zinc-800 rounded-lg">
                <h3 className="text-xl font-bold mb-4 pt-6 mx-6">Все сообщения пользователя ({selectedAssistantUser.messages.length})</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pb-6 mx-6 custom-scrollbar">
                {selectedAssistantUser.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-sm p-4 rounded-lg ${
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
            </div>
          </div>
        )}

      </div>
    </div>
  );
}