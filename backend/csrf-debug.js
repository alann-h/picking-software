#!/usr/bin/env node

/**
 * CSRF Debug Script
 * Run this in production to test CSRF token generation and validation
 */

import fetch from 'node-fetch';

const API_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function testCsrfFlow() {
  console.log('🔍 Testing CSRF Flow...\n');
  
  try {
    // Step 1: Test session creation (login simulation)
    console.log('1. Testing session creation...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      }),
      credentials: 'include'
    });
    
    console.log(`   Login response status: ${loginResponse.status}`);
    const cookies = loginResponse.headers.get('set-cookie');
    console.log(`   Cookies received: ${cookies ? 'Yes' : 'No'}`);
    
    // Step 2: Test CSRF token generation
    console.log('\n2. Testing CSRF token generation...');
    const csrfResponse = await fetch(`${API_BASE}/csrf-token`, {
      credentials: 'include'
    });
    
    console.log(`   CSRF response status: ${csrfResponse.status}`);
    if (csrfResponse.ok) {
      const csrfData = await csrfResponse.json();
      console.log(`   CSRF token received: ${csrfData.csrfToken ? 'Yes' : 'No'}`);
      console.log(`   Session ID: ${csrfData.sessionId}`);
      console.log(`   Timestamp: ${csrfData.timestamp}`);
    } else {
      const errorData = await csrfResponse.text();
      console.log(`   Error: ${errorData}`);
    }
    
    // Step 3: Test protected endpoint with CSRF token
    if (csrfResponse.ok) {
      const csrfData = await csrfResponse.json();
      console.log('\n3. Testing protected endpoint with CSRF token...');
      
      const protectedResponse = await fetch(`${API_BASE}/verifyUser`, {
        method: 'GET',
        headers: {
          'x-csrf-token': csrfData.csrfToken
        },
        credentials: 'include'
      });
      
      console.log(`   Protected endpoint response status: ${protectedResponse.status}`);
      if (protectedResponse.ok) {
        const userData = await protectedResponse.json();
        console.log(`   User verification successful: ${userData.isValid}`);
      } else {
        const errorData = await protectedResponse.text();
        console.log(`   Error: ${errorData}`);
      }
    }
    
    // Step 4: Test debug endpoint
    console.log('\n4. Testing debug endpoint...');
    const debugResponse = await fetch(`${API_BASE}/debug/session`, {
      credentials: 'include'
    });
    
    console.log(`   Debug response status: ${debugResponse.status}`);
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log(`   Session exists: ${debugData.sessionExists}`);
      console.log(`   Session ID: ${debugData.sessionId}`);
      console.log(`   Environment: ${debugData.environment}`);
      console.log(`   CSRF session ensured: ${debugData.csrfSessionEnsured}`);
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run the test
testCsrfFlow();
