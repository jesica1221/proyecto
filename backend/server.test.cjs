const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { openDatabase } = require('./database.cjs');
const { createApp } = require('./server.cjs');

let db;
let server;
let baseUrl;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parking-api-'));
const webDir = path.join(tempDir, 'web');
const originalWebRoot = process.env.WEB_ROOT;
const originalJournalMode = process.env.SQLITE_JOURNAL_MODE;

before(async () => {
  fs.mkdirSync(webDir, { recursive: true });
  fs.writeFileSync(path.join(webDir, 'index.html'), '<h1>Home</h1>');
  fs.writeFileSync(path.join(webDir, 'login.html'), '<h1>Login</h1>');
  process.env.WEB_ROOT = webDir;
  process.env.SQLITE_JOURNAL_MODE = 'DELETE';
  db = openDatabase(path.join(tempDir, 'test.sqlite'));
  assert.equal(db.pragma('journal_mode', { simple: true }), 'delete');
  server = createApp(db).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  if (originalWebRoot === undefined) delete process.env.WEB_ROOT;
  else process.env.WEB_ROOT = originalWebRoot;
  if (originalJournalMode === undefined) delete process.env.SQLITE_JOURNAL_MODE;
  else process.env.SQLITE_JOURNAL_MODE = originalJournalMode;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

async function post(url, body, token) {
  return fetch(`${baseUrl}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }).then((response) => response.json());
}

test('serves static web routes alongside the API', async () => {
  const home = await fetch(`${baseUrl}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Home/);

  const login = await fetch(`${baseUrl}/login`);
  assert.equal(login.status, 200);
  assert.match(await login.text(), /Login/);

  const missing = await fetch(`${baseUrl}/missing`);
  assert.equal(missing.status, 404);
});

test('shares account, reservation, history and occupancy through the API', async () => {
  const registered = await post('/eficient-parking-lot/registro.php', {
    nombre: 'Prueba Estudiante',
    cedula: '900001',
    clave: 'PasswordSeguro1!',
    rol: 'estudiante',
    placa: 'TEST123',
    tipoVehiculo: 'carro',
    aceptaTerminos: '1',
  });
  assert.equal(registered.success, true);
  assert.ok(registered.token);

  const spaces = await post('/eficient-parking-lot/espacios.php', { zona: 1 }, registered.token);
  assert.equal(spaces.success, true);
  assert.ok(spaces.espacios.length > 0);
  const reserved = await post('/eficient-parking-lot/reservar.php', { idEspacio: spaces.espacios[0].id }, registered.token);
  assert.equal(reserved.success, true);

  const active = await post('/eficient-parking-lot/reserva_activa.php', {}, registered.token);
  assert.equal(active.reserva.numero, spaces.espacios[0].numero);

  const history = await post('/eficient-parking-lot/historial.php', {}, registered.token);
  assert.equal(history.historial.length, 1);

  const duplicate = await post('/eficient-parking-lot/reservar.php', { idEspacio: spaces.espacios[1].id }, registered.token);
  assert.equal(duplicate.success, false);

  const admin = await post('/eficient-parking-lot/login.php', {
    cedula: '1000000002',
    password: 'Demo2026!Parking',
  });
  const dashboard = await fetch(`${baseUrl}/api/dashboard/overview`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  }).then((response) => response.json());
  assert.equal(dashboard.metricas.ocupados, 1);
  assert.equal(dashboard.zonas.reduce((sum, zone) => sum + zone.capacidad, 0), 125);

  const cancelled = await post('/eficient-parking-lot/cancelar.php', {}, registered.token);
  assert.equal(cancelled.success, true);
  const empty = await post('/eficient-parking-lot/reserva_activa.php', {}, registered.token);
  assert.equal(empty.reserva, null);
});

test('rejects privileged account registration and unauthorized dashboard access', async () => {
  const withoutTerms = await post('/eficient-parking-lot/registro.php', {
    nombre: 'Sin aceptar términos',
    cedula: '900003',
    clave: 'PasswordSeguro1!',
    rol: 'estudiante',
    placa: 'TEST124',
    tipoVehiculo: 'carro',
  });
  assert.equal(withoutTerms.success, false);
  assert.equal(withoutTerms.message, 'Debes aceptar los términos y condiciones.');

  const privileged = await post('/eficient-parking-lot/registro.php', {
    nombre: 'No autorizado',
    cedula: '900002',
    clave: 'PasswordSeguro1!',
    rol: 'admin',
    claveAdmin: 'admin123',
    aceptaTerminos: '1',
  });
  assert.equal(privileged.success, false);

  const student = await post('/eficient-parking-lot/login.php', {
    cedula: '1000000001',
    password: 'Demo2026!Parking',
  });
  const response = await fetch(`${baseUrl}/api/dashboard/overview`, {
    headers: { Authorization: `Bearer ${student.token}` },
  });
  assert.equal(response.status, 403);

  const security = await post('/eficient-parking-lot/login.php', {
    cedula: '1000000003',
    password: 'Demo2026!Parking',
  });
  const visitor = await post('/eficient-parking-lot/crear_visitante.php', { placa: 'VIS123' }, security.token);
  assert.equal(visitor.success, true);
  const spaces = await fetch(`${baseUrl}/eficient-parking-lot/admin_espacios.php`, {
    headers: { Authorization: `Bearer ${security.token}` },
  }).then((result) => result.json());
  const availableSpace = spaces.libres.find((space) => space.zonaId === '1');
  const assigned = await post('/eficient-parking-lot/asignar_visitante.php', {
    nombre: 'Visita de prueba',
    placa: 'VIS123',
    espacioId: availableSpace.id,
  }, security.token);
  assert.equal(assigned.success, true);

  const verified = await post('/eficient-parking-lot/buscar_placa_activa.php', { placa: 'VIS123' }, security.token);
  assert.equal(verified.tieneParqueadero, true);
});
