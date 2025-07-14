#!/usr/bin/env node

// Simple script to test Supabase connection using Node.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Testing Supabase Connection...');
console.log('📊 Environment Variables:');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Present' : 'Missing');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing');

async function testSupabaseConnection() {
    try {
        if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
            console.error('❌ Missing required environment variables');
            return;
        }

        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY
        );

        console.log('🔄 Testing basic connection...');
        
        // Test basic connection by getting user count
        const { data, error } = await supabase
            .from('watch_history')
            .select('count')
            .limit(1);

        if (error) {
            console.error('❌ Connection test failed:', error);
        } else {
            console.log('✅ Connection test successful');
            console.log('📊 Response:', data);
        }

        // Test auth endpoint
        console.log('🔑 Testing auth endpoint...');
        const authResponse = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
            headers: {
                'apikey': process.env.VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
            }
        });

        console.log('🔍 Auth endpoint response status:', authResponse.status);
        if (authResponse.ok) {
            console.log('✅ Auth endpoint is accessible');
        } else {
            console.error('❌ Auth endpoint returned error:', authResponse.status);
        }

    } catch (error) {
        console.error('💥 Connection test error:', error);
    }
}

testSupabaseConnection();