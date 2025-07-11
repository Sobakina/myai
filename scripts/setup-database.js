const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Читаем переменные окружения
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('Setting up database schema...');
    
    // Проверяем существование таблицы chats
    console.log('Checking if chats table exists...');
    const { error: chatsError } = await supabase
      .from('chats')
      .select('id')
      .limit(1);
    
    if (chatsError && (chatsError.code === 'PGRST116' || chatsError.message.includes('does not exist'))) {
      // Таблица не существует
      console.log('Table chats does not exist, need to create via Supabase Dashboard');
      console.log('\nPlease execute the following SQL in your Supabase Dashboard:');
      console.log('https://supa.3gx.ru/project/default/sql');
      console.log('\n--- Copy and execute this SQL ---');
      
      const sqlPath = path.join(__dirname, '../sql/chat_schema.sql');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      console.log(sqlContent);
      console.log('--- End of SQL ---\n');
      
      return;
    } else if (chatsError) {
      console.error('Unexpected error checking chats table:', chatsError);
      throw chatsError;
    }
    
    console.log('Tables already exist or database setup completed!');
    
  } catch (error) {
    console.error('Error setting up database:', error);
    console.log('\nPlease execute the SQL manually in Supabase Dashboard:');
    console.log('https://supa.3gx.ru/project/default/sql');
    
    const sqlPath = path.join(__dirname, '../sql/chat_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('\n--- Copy and execute this SQL ---');
    console.log(sqlContent);
    console.log('--- End of SQL ---\n');
  }
}

setupDatabase();