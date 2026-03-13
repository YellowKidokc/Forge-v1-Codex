const { Client } = require('pg');

const client = new Client({
  host: '192.168.1.177',
  port: 2665,
  user: 'postgres',
  password: 'Moss9pep2828',
  database: 'theophysics',
});

async function testConnection() {
  try {
    await client.connect();
    console.log('--- CONNECTION SUCCESSFUL ---');
    
    const tables = await client.query(\
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    \);
    console.log('Tables in ""theophysics"":');
    tables.rows.forEach(row => console.log(\ - \\));

    await client.end();
  } catch (err) {
    console.error('--- CONNECTION FAILED ---');
    console.error(err.message);
    process.exit(1);
  }
}

testConnection();
