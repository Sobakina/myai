-- Добавляем уникальное ограничение для предотвращения дублирования сообщений
-- (одинаковые сообщения от одного пользователя одному ассистенту в одно время)

-- Сначала удалим существующие дубли (если есть)
WITH duplicates AS (
  SELECT 
    id,
    content,
    assistant_id,
    user_fingerprint,
    role,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY assistant_id, user_fingerprint, content, role, 
                   DATE_TRUNC('minute', created_at)
      ORDER BY created_at ASC
    ) as rn
  FROM messages
)
DELETE FROM messages 
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Добавляем составной индекс для предотвращения дублирования одинаковых сообщений
-- в течение одной минуты (это поможет с приветственными сообщениями)
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_unique_content 
ON messages (assistant_id, user_fingerprint, content, DATE_TRUNC('minute', created_at));