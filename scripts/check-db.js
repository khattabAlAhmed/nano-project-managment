const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^DATABASE_URL=(.+)$/m);
      if (match) {
        connectionString = match[1].trim();
      }
    }
  } catch (err) {
    console.error('Warning: Failed to read .env.local file:', err.message);
  }
}

if (!connectionString) {
  console.error('Error: DATABASE_URL not found');
  process.exit(1);
}

// Clean connection string quotes if any
connectionString = connectionString.replace(/^["']|["']$/g, '');

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database successfully!');

    // Query tables
    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name;
    `);

    console.log(`\nFound ${res.rows.length} tables:`);
    res.rows.forEach(row => {
      console.log(`- [${row.table_schema}] ${row.table_name}`);
    });

    // Query enums
    const enumsRes = await client.query(`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      ORDER BY t.typname, e.enumlabel;
    `);

    console.log(`\nFound ${enumsRes.rows.length} enum values:`);
    const enums = {};
    enumsRes.rows.forEach(row => {
      if (!enums[row.enum_name]) enums[row.enum_name] = [];
      enums[row.enum_name].push(row.enum_value);
    });
    for (const [name, values] of Object.entries(enums)) {
      console.log(`- ${name}: [${values.join(', ')}]`);
    }

  } catch (err) {
    console.error('Database connection error:', err.message);
  } finally {
    await client.end();
  }
}

run();
