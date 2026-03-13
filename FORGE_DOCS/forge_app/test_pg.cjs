const fs = require('fs');
const { Client } = require('pg');
const out = 'C:\\Users\\lowes\\pg_result.txt';
fs.writeFileSync(out, '');

async function test(label, config) {
  fs.appendFileSync(out, label + ': ');
  const c = new Client({...config, connectionTimeoutMillis: 5000});
  try {
    await c.connect();
    const r = await c.query('SELECT current_database() as db');
    fs.appendFileSync(out, 'OK - ' + JSON.stringify(r.rows) + '\n');
    await c.end();
  } catch(e) {
    fs.appendFileSync(out, 'FAIL - ' + e.message + '\n');
    try { await c.end(); } catch(x) {}
  }
}

(async () => {
  await test('postgres/Yellowkid/theophysics', {host:'192.168.1.177',port:2665,user:'postgres',password:'Yellowkid',database:'theophysics'});
  await test('david/Yellowkid/theophysics', {host:'192.168.1.177',port:2665,user:'david',password:'Yellowkid',database:'theophysics'});
  await test('lowes/Yellowkid/theophysics', {host:'192.168.1.177',port:2665,user:'lowes',password:'Yellowkid',database:'theophysics'});
  await test('postgres/Moss9pep2828/theophysics', {host:'192.168.1.177',port:2665,user:'postgres',password:'Moss9pep2828',database:'theophysics'});
  await test('david/Moss9pep2828/theophysics', {host:'192.168.1.177',port:2665,user:'david',password:'Moss9pep2828',database:'theophysics'});
  await test('postgres/Yellowkid/postgres', {host:'192.168.1.177',port:2665,user:'postgres',password:'Yellowkid',database:'postgres'});
})();
