-- Удаляем дублирующиеся сообщения, оставляя только самые ранние
WITH duplicates AS (
  SELECT 
    id,
    content,
    assistant_id,
    user_fingerprint,
    role,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY assistant_id, user_fingerprint, content, role 
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

-- Проверяем результат
SELECT 
  assistant_id,
  user_fingerprint,
  COUNT(*) as message_count,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message
FROM messages 
GROUP BY assistant_id, user_fingerprint 
ORDER BY first_message DESC;