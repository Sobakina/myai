-- Удаляем все приветственные сообщения из БД
-- Они будут показываться только в UI

DELETE FROM messages 
WHERE role = 'assistant' 
  AND (
    content LIKE 'Привет! Я %' 
    OR content LIKE 'Hello! I am %'
    OR content LIKE 'Hi! I''m %'
  );

-- Проверяем, что осталось
SELECT 
  assistant_id,
  user_fingerprint,
  COUNT(*) as message_count,
  MIN(created_at) as first_message
FROM messages 
GROUP BY assistant_id, user_fingerprint 
ORDER BY first_message DESC;