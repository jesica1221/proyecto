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

before(async () => {
  db = openDatabase(path.join(tempDir, 'test.sqlite'));
  server = createApp(db).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
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

test('shares account, reservation, history and occupancy through the API', async () => {
  const registered = await post('/eficient-parking-lot/registro.php', {
    nombre: 'Prueba Estudiante',
    cedula: '900001',
    clave: 'PasswordSeguro1!',
    rol: 'estudiante',
    placa: 'TEST123',
    tipoVehiculo: 'carro',
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
  const privileged = await post('/eficient-parking-lot/registro.php', {
    nombre: 'No autorizado',
    cedula: '900002',
    clave: 'PasswordSeguro1!',
    rol: 'admin',
    claveAdmin: 'admin123',
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
