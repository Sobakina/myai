-- Миграция для перехода от chat_id к assistant_id + user_fingerprint
-- Шаг 1: Добавляем новые колонки в таблицу messages

ALTER TABLE messages 
ADD COLUMN assistant_id UUID REFERENCES assistants(id),
ADD COLUMN user_fingerprint TEXT;

-- Шаг 2: Заполняем новые колонки данными из связанной таблицы chats
UPDATE messages 
SET 
  assistant_id = chats.assistant_id,
  user_fingerprint = chats.user_fingerprint
FROM chats 
WHERE messages.chat_id = chats.id;

-- Шаг 3: Устанавливаем NOT NULL ограничения для новых колонок
ALTER TABLE messages 
ALTER COLUMN assistant_id SET NOT NULL,
ALTER COLUMN user_fingerprint SET NOT NULL;

-- Шаг 4: Удаляем старую колонку chat_id
ALTER TABLE messages DROP COLUMN chat_id;

-- Шаг 5: Создаем новые индексы для оптимизации
CREATE INDEX idx_messages_assistant_id ON messages(assistant_id);
CREATE INDEX idx_messages_user_fingerprint ON messages(user_fingerprint);
CREATE INDEX idx_messages_assistant_user ON messages(assistant_id, user_fingerprint);

-- Шаг 6: Удаляем политики RLS для таблицы chats
DROP POLICY IF EXISTS "Users can view own chats" ON chats;
DROP POLICY IF EXISTS "Users can create own chats" ON chats;
DROP POLICY IF EXISTS "Users can update own chats" ON chats;

-- Шаг 7: Удаляем таблицу chats
DROP TABLE chats;

-- Обновляем политики RLS для messages (по необходимости)
-- Политики остаются с true, так как авторизация будет на уровне приложения