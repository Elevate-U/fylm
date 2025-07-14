#!/usr/bin/env node

// Debug script to test the AuthProvider loading issue
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Debugging AuthProvider Loading Issue...');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('📊 Environment Variables:');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthGetSession() {
    console.log('🔄 Testing supabase.auth.getSession()...');
    
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000);
    });
    
    try {
        const startTime = Date.now();
        const result = await Promise.race([
            supabase.auth.getSession(),
            timeoutPromise
        ]);
        
        const endTime = Date.now();
        console.log(`✅ getSession completed in ${endTime - startTime}ms`);
        console.log('📊 Session data:', {
            hasSession: !!result.data.session,
            hasUser: !!result.data.session?.user,
            error: result.error
        });
        
        if (result.error) {
            console.error('❌ getSession error:', result.error);
        }
        
    } catch (error) {
        console.error('❌ getSession failed:', error.message);
    }
}

async function testAuthSettings() {
    console.log('🔄 Testing auth settings endpoint...');
    
    try {
        const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
            }
        });
        
        console.log('📊 Auth settings response:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Auth settings accessible');
        } else {
            console.error('❌ Auth settings error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ Auth settings failed:', error.message);
    }
}

async function runTests() {
    await testAuthSettings();
    await testAuthGetSession();
    console.log('🏁 Debug complete!');
}

runTests().catch(console.error);