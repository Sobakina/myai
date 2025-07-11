-- Исправленная миграция для перехода от chat_id к assistant_id + user_fingerprint
-- Добавлены проверки и обработка NULL значений

-- Шаг 1: Добавляем новые колонки в таблицу messages
ALTER TABLE messages 
ADD COLUMN assistant_id UUID,
ADD COLUMN user_fingerprint TEXT;

-- Шаг 2: Проверяем данные перед миграцией
DO $$
BEGIN
    -- Проверяем, есть ли записи в messages без соответствующих chats
    IF EXISTS (
        SELECT 1 
        FROM messages m 
        LEFT JOIN chats c ON m.chat_id = c.id 
        WHERE c.id IS NULL
    ) THEN
        RAISE NOTICE 'Found orphaned messages without corresponding chats. These will be deleted.';
        
        -- Удаляем записи без соответствующих чатов
        DELETE FROM messages 
        WHERE chat_id NOT IN (SELECT id FROM chats WHERE id IS NOT NULL);
        
        RAISE NOTICE 'Deleted orphaned messages.';
    END IF;
    
    -- Проверяем, есть ли чаты с NULL assistant_id
    IF EXISTS (
        SELECT 1 
        FROM chats 
        WHERE assistant_id IS NULL
    ) THEN
        RAISE NOTICE 'Found chats with NULL assistant_id. These need to be fixed.';
        
        -- Можно либо удалить такие чаты, либо назначить дефолтный assistant_id
        -- Вариант 1: Удаляем чаты с NULL assistant_id и их сообщения
        DELETE FROM messages 
        WHERE chat_id IN (SELECT id FROM chats WHERE assistant_id IS NULL);
        
        DELETE FROM chats 
        WHERE assistant_id IS NULL;
        
        RAISE NOTICE 'Deleted chats and messages with NULL assistant_id.';
    END IF;
END $$;

-- Шаг 3: Заполняем новые колонки данными из связанной таблицы chats
UPDATE messages 
SET 
  assistant_id = chats.assistant_id,
  user_fingerprint = chats.user_fingerprint
FROM chats 
WHERE messages.chat_id = chats.id;

-- Шаг 4: Проверяем, что все записи обновились
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM messages 
        WHERE assistant_id IS NULL OR user_fingerprint IS NULL
    ) THEN
        RAISE EXCEPTION 'Some messages still have NULL assistant_id or user_fingerprint. Migration cannot continue.';
    END IF;
END $$;

-- Шаг 5: Устанавливаем NOT NULL ограничения для новых колонок
ALTER TABLE messages 
ALTER COLUMN assistant_id SET NOT NULL,
ALTER COLUMN user_fingerprint SET NOT NULL;

-- Шаг 6: Добавляем foreign key constraint
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_assistant 
FOREIGN KEY (assistant_id) REFERENCES assistants(id);

-- Шаг 7: Удаляем старую колонку chat_id
ALTER TABLE messages DROP COLUMN chat_id;

-- Шаг 8: Создаем новые индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_messages_assistant_id ON messages(assistant_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_fingerprint ON messages(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_messages_assistant_user ON messages(assistant_id, user_fingerprint);

-- Шаг 9: Удаляем политики RLS для таблицы chats
DROP POLICY IF EXISTS "Users can view own chats" ON chats;
DROP POLICY IF EXISTS "Users can create own chats" ON chats;
DROP POLICY IF EXISTS "Users can update own chats" ON chats;

-- Шаг 10: Удаляем таблицу chats
DROP TABLE chats;

-- Выводим финальную статистику
DO $$
DECLARE
    message_count INTEGER;
    conversation_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO message_count FROM messages;
    
    SELECT COUNT(DISTINCT (assistant_id, user_fingerprint)) INTO conversation_count FROM messages;
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Total messages: %', message_count;
    RAISE NOTICE 'Unique conversations: %', conversation_count;
END $$;