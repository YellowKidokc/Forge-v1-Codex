const fs = require('fs');
const { Client } = require('pg');
const out = 'C:\\Users\\lowes\\pg_result.txt';
fs.writeFileSync(out, 'starting\n');
const c = new Client({
  host: '192.168.1.177',
  port: 2665,
  user: 'postgres',
  password: 'Moss9pep2828',
  database: 'theophysics',
  connectionTimeoutMillis: 5000
});
c.connect()
  .then(() => { fs.appendFileSync(out, 'connected\n'); return c.query('SELECT current_database() as db'); })
  .then(r => { fs.appendFileSync(out, 'result: ' + JSON.stringify(r.rows) + '\n'); c.end(); })
  .catch(e => { fs.appendFileSync(out, 'error: ' + e.message + '\n'); c.end(); });
