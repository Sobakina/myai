-- Скрипт для проверки данных перед миграцией

-- 1. Проверяем количество записей в каждой таблице
SELECT 'messages' as table_name, COUNT(*) as count FROM messages
UNION ALL
SELECT 'chats' as table_name, COUNT(*) as count FROM chats;

-- 2. Проверяем, есть ли messages без соответствующих chats
SELECT 
    'orphaned_messages' as issue,
    COUNT(*) as count
FROM messages m 
LEFT JOIN chats c ON m.chat_id = c.id 
WHERE c.id IS NULL;

-- 3. Проверяем, есть ли чаты с NULL assistant_id
SELECT 
    'chats_with_null_assistant_id' as issue,
    COUNT(*) as count
FROM chats 
WHERE assistant_id IS NULL;

-- 4. Проверяем, есть ли чаты с NULL user_fingerprint
SELECT 
    'chats_with_null_user_fingerprint' as issue,
    COUNT(*) as count
FROM chats 
WHERE user_fingerprint IS NULL;

-- 5. Показываем примеры записей с проблемами
SELECT 
    'Sample messages without chats' as description,
    m.id as message_id,
    m.chat_id,
    m.content,
    m.created_at
FROM messages m 
LEFT JOIN chats c ON m.chat_id = c.id 
WHERE c.id IS NULL
LIMIT 5;

-- 6. Показываем примеры чатов с NULL assistant_id
SELECT 
    'Sample chats with NULL assistant_id' as description,
    c.id as chat_id,
    c.title,
    c.assistant_id,
    c.user_fingerprint,
    c.created_at
FROM chats c
WHERE c.assistant_id IS NULL
LIMIT 5;

-- 7. Проверяем существование таблицы assistants
SELECT 
    'assistants_table_exists' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assistants') 
        THEN 'YES' 
        ELSE 'NO' 
    END as result;