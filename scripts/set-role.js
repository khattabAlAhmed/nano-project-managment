const fs = require('fs');
const path = require('path');

// 1. Manually parse .env.local to find CLERK_SECRET_KEY
let clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^CLERK_SECRET_KEY=(.+)$/m);
      if (match) {
        clerkSecretKey = match[1].trim();
      }
    }
  } catch (err) {
    console.error('Warning: Failed to read .env.local file:', err.message);
  }
}

if (!clerkSecretKey) {
  console.error('Error: CLERK_SECRET_KEY not found in environment or .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
const emailOrId = args[0];
const targetRole = args[1]?.toUpperCase() || 'PROJECT_MANAGER';

const VALID_ROLES = ['PROJECT_MANAGER', 'CENTER_MANAGER', 'VIEWER'];

if (!VALID_ROLES.includes(targetRole)) {
  console.error(`Error: Invalid role "${targetRole}". Must be one of: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

async function run() {
  try {
    // 2. Fetch all users from Clerk to find match
    const listRes = await fetch('https://api.clerk.com/v1/users?limit=100', {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`
      }
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      throw new Error(`Failed to list users from Clerk: ${errText}`);
    }

    const users = await listRes.json();
    let targetUser = null;

    if (emailOrId) {
      targetUser = users.find(u => {
        const matchesId = u.id === emailOrId;
        const matchesEmail = u.email_addresses?.some(e => e.email_address.toLowerCase() === emailOrId.toLowerCase());
        return matchesId || matchesEmail;
      });
    }

    if (!targetUser) {
      console.log('\n--- Clerk Users List ---');
      users.forEach(u => {
        const email = u.email_addresses?.[0]?.email_address || 'No email';
        const role = u.public_metadata?.role || 'VIEWER';
        console.log(`- Email: ${email} | ID: ${u.id} | Current Role: ${role}`);
      });
      console.log('\nUsage:');
      console.log('  node scripts/set-role.js <email-or-userId> [ROLE]');
      console.log('\nRoles:');
      console.log('  PROJECT_MANAGER (Default), CENTER_MANAGER, VIEWER');
      process.exit(emailOrId ? 1 : 0);
    }

    console.log(`Updating role for ${targetUser.email_addresses?.[0]?.email_address || targetUser.id}...`);

    // 3. Update public_metadata with the new role
    const updateRes = await fetch(`https://api.clerk.com/v1/users/${targetUser.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public_metadata: {
          ...targetUser.public_metadata,
          role: targetRole
        }
      })
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Failed to update metadata: ${errText}`);
    }

    const updatedUser = await updateRes.json();
    console.log(`Success! Updated role to: ${updatedUser.public_metadata?.role}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
