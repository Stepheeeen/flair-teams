/**
 * Admin Creation Script
 * Usage: npx ts-node scripts/create-admin.ts
 *
 * This script creates the first admin user for the Flair Teams application.
 * Run this before deploying to production.
 */

import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import * as readline from 'readline';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mongodbUri = process.env.MONGODB_URI;

if (!supabaseUrl || !supabaseServiceKey || !mongodbUri) {
  console.error('Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('  - MONGODB_URI');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log('\n🔧 Flair Teams - Admin User Creation\n');

    // Get user input
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');
    const name = await question('Enter admin name: ');

    // Validate input
    if (!email || !password || !name) {
      console.error('\n❌ All fields are required');
      rl.close();
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('\n❌ Password must be at least 6 characters');
      rl.close();
      process.exit(1);
    }

    console.log('\n⏳ Creating admin user...\n');

    // Connect to Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('❌ Supabase error:', authError.message);
      rl.close();
      process.exit(1);
    }

    if (!authData.user) {
      console.error('❌ Failed to create user');
      rl.close();
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(mongodbUri);

    // Create MongoDB user record
    const userSchema = new mongoose.Schema({
      id: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      name: String,
      avatar_url: String,
      role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    const User = mongoose.models.User || mongoose.model('User', userSchema);

    const user = await User.create({
      id: authData.user.id,
      email,
      name,
      role: 'admin',
    });

    await mongoose.disconnect();

    console.log('\n✅ Admin user created successfully!\n');
    console.log('Admin Details:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  User ID: ${user.id}\n`);

    rl.close();
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();
