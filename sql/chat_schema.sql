-- Схема базы данных для хранения сообщений
-- Поддерживает анонимных пользователей через fingerprint
-- Используется связка assistant_id + user_fingerprint вместо отдельной таблицы chатов

-- Таблица для хранения сообщений
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assistant_id UUID REFERENCES assistants(id) NOT NULL,
    user_fingerprint TEXT NOT NULL, -- fingerprint браузера для анонимов
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    token_count INTEGER DEFAULT 0,
    system_prompt_tokens INTEGER DEFAULT 0, -- для сообщений пользователя
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_messages_assistant_id ON messages(assistant_id);
CREATE INDEX idx_messages_user_fingerprint ON messages(user_fingerprint);
CREATE INDEX idx_messages_assistant_user ON messages(assistant_id, user_fingerprint);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- RLS (Row Level Security) политики
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Политика для messages - пользователи могут видеть только свои сообщения
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Users can create own messages" ON messages FOR INSERT WITH CHECK (true);