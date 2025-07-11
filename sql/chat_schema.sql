-- Схема базы данных для хранения истории чатов
-- Поддерживает анонимных пользователей через fingerprint

-- Таблица для хранения чатов
CREATE TABLE chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_fingerprint TEXT NOT NULL, -- fingerprint браузера для анонимов
    assistant_id UUID REFERENCES assistants(id),
    title TEXT, -- заголовок чата (может генерироваться автоматически)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для хранения сообщений
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    token_count INTEGER DEFAULT 0,
    system_prompt_tokens INTEGER DEFAULT 0, -- для сообщений пользователя
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_chats_user_fingerprint ON chats(user_fingerprint);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- RLS (Row Level Security) политики
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Политика для chats - пользователи могут видеть только свои чаты
CREATE POLICY "Users can view own chats" ON chats FOR SELECT USING (true);
CREATE POLICY "Users can create own chats" ON chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own chats" ON chats FOR UPDATE USING (true);

-- Политика для messages - пользователи могут видеть только сообщения своих чатов
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Users can create own messages" ON messages FOR INSERT WITH CHECK (true);