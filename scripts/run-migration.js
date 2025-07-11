const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Читаем переменные окружения
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Make sure you have SUPABASE_SERVICE_ROLE_KEY in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Проверяем, существует ли таблица chats
    console.log('📋 Checking if chats table exists...');
    const { error: chatsError } = await supabase
      .from('chats')
      .select('id')
      .limit(1);
    
    if (chatsError && (chatsError.code === 'PGRST116' || chatsError.message.includes('does not exist'))) {
      console.log('❌ Table chats does not exist. Migration already completed or not needed.');
      return;
    }

    // Проверяем, есть ли уже новые колонки в messages
    console.log('🔍 Checking current messages table structure...');
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('assistant_id')
      .limit(1);
    
    if (!messagesError && messagesData !== null) {
      console.log('✅ Migration already completed - assistant_id column exists.');
      return;
    }

    console.log('⚠️  This migration will make irreversible changes to your database.');
    console.log('📄 Please run the migration manually in Supabase Dashboard:');
    console.log('🔗 https://supa.3gx.ru/project/default/sql');
    console.log('\n--- Copy and execute this SQL ---');
    
    const migrationPath = path.join(__dirname, '../sql/migration_remove_chats.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(migrationSQL);
    console.log('--- End of SQL ---\n');
    
    console.log('⚠️  WARNING: This migration will:');
    console.log('   1. Add assistant_id and user_fingerprint columns to messages');
    console.log('   2. Copy data from chats table to messages');
    console.log('   3. Drop the chats table permanently');
    console.log('   4. Remove chat_id column from messages');
    console.log('\n💾 Make sure you have a backup before proceeding!');
    
  } catch (error) {
    console.error('❌ Error during migration check:', error);
    process.exit(1);
  }
}

runMigration();