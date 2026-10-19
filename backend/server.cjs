const crypto = require('node:crypto');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { openDatabase } = require('./database.cjs');

const appPort = Number(process.env.PORT || 4000);
const listenHost = process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-only-change-this-secret');

function createApp(db = openDatabase()) {
  if (!jwtSecret) throw new Error('Set JWT_SECRET to a random secret before starting in production.');
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  const nowIso = () => new Date().toISOString();
  const normalizeRole = (role) => {
    const value = String(role || '').trim().toLowerCase();
    if (value === 'estudiante') return 'student';
    if (value === 'seguridad') return 'security';
    return value;
  };
  const vehicleType = (type) => {
    const value = String(type || '').trim().toLowerCase();
    if (['moto', 'motorcycle', 'motocicleta'].includes(value)) return 'motorcycle';
    return 'car';
  };
  const publicUser = (user) => ({
    id: String(user.id),
    cedula: user.cedula,
    nombre: user.name,
    rol: user.role === 'visitor' ? 'student' : user.role,
    placa: user.plate,
    tipoVehiculo: user.vehicle_type === 'motorcycle' ? 'moto' : 'carro',
  });
  const issueToken = (user) => jwt.sign(
    { sub: String(user.id), role: user.role },
    jwtSecret,
    { expiresIn: '12h', issuer: 'efficient-parking-api' },
  );
  const sendFailure = (res, status, message) => res.status(status).json({ success: false, message });
  const expireReservations = () => {
    const expired = db.prepare(`
      SELECT id FROM reservations WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= ?
    `).all(nowIso());
    if (!expired.length) return;
    const tx = db.transaction(() => {
      const finish = db.prepare("UPDATE reservations SET status = 'expired', ended_at = ? WHERE id = ?");
      const event = db.prepare("INSERT INTO parking_events (reservation_id, event_type, created_at) VALUES (?, 'expired', ?)");
      for (const row of expired) {
        finish.run(nowIso(), row.id);
        event.run(row.id, nowIso());
      }
    });
    tx();
  };
  const authenticate = (req, res, next) => {
    const authHeader = req.get('authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const token = bearer || req.body?.token || req.query?.token;
    if (!token) return sendFailure(res, 401, 'Inicia sesión para continuar.');
    try {
      const payload = jwt.verify(token, jwtSecret, { issuer: 'efficient-parking-api' });
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(payload.sub));
      if (!user) return sendFailure(res, 401, 'La sesión ya no es válida.');
      req.user = user;
      return next();
    } catch {
      return sendFailure(res, 401, 'La sesión expiró o no es válida.');
    }
  };
  const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return sendFailure(res, 403, 'No tienes permisos para esta operación.');
    return next();
  };
  const asSpace = (spaceId) => db.prepare(`
    SELECT s.id, s.number, s.zone_id, z.name AS zone_name, z.vehicle_type
    FROM parking_spaces s JOIN zones z ON z.id = s.zone_id WHERE s.id = ?
  `).get(Number(spaceId));
  const activeReservationForUser = (userId) => db.prepare(`
    SELECT r.*, s.number, s.zone_id, z.name AS zone_name
    FROM reservations r
    JOIN parking_spaces s ON s.id = r.space_id
    JOIN zones z ON z.id = s.zone_id
    WHERE r.user_id = ? AND r.status = 'active'
  `).get(userId);
  const eventFor = (reservationId, type) => db.prepare(
    'INSERT INTO parking_events (reservation_id, event_type, created_at) VALUES (?, ?, ?)',
  ).run(reservationId, type, nowIso());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'efficient-parking-api' }));

  app.post('/eficient-parking-lot/login.php', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE cedula = ?').get(String(req.body.cedula || '').trim());
    if (!user || !bcrypt.compareSync(String(req.body.password || req.body.clave || ''), user.password_hash)) {
      return sendFailure(res, 401, 'Cédula o contraseña incorrectas.');
    }
    return res.json({ success: true, user: publicUser(user), token: issueToken(user) });
  });

  app.post('/eficient-parking-lot/registro.php', (req, res) => {
    const { nombre, cedula, clave, rol, placa, tipoVehiculo, claveAdmin } = req.body;
    const normalizedRole = normalizeRole(rol);
    const allowedRole = normalizedRole === 'student'
      ? 'student'
      : ['admin', 'security'].includes(normalizedRole) ? normalizedRole : '';
    if (!nombre || !cedula || String(clave || '').length < 8) {
      return sendFailure(res, 400, 'Completa nombre y cédula; la contraseña debe tener al menos 8 caracteres.');
    }
    if (normalizedRole === 'student' && !String(placa || '').trim()) {
      return sendFailure(res, 400, 'La placa es obligatoria para una cuenta de estudiante.');
    }
    if (!allowedRole) return sendFailure(res, 400, 'El tipo de cuenta no es válido.');
    const expectedKey = allowedRole === 'admin'
      ? process.env.ADMIN_REGISTRATION_KEY
      : allowedRole === 'security' ? process.env.SECURITY_REGISTRATION_KEY : null;
    if (allowedRole !== 'student' && (!expectedKey || claveAdmin !== expectedKey)) {
      return sendFailure(res, 403, 'La creación de cuentas privilegiadas requiere una clave autorizada.');
    }
    try {
      const result = db.prepare(`
        INSERT INTO users (cedula, name, password_hash, role, plate, vehicle_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        String(cedula).trim(),
        String(nombre).trim(),
        bcrypt.hashSync(String(clave), 10),
        allowedRole,
        String(placa || '').trim().toUpperCase(),
        vehicleType(tipoVehiculo),
        nowIso(),
      );
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      return res.status(201).json({ success: true, user: publicUser(user), token: issueToken(user) });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return sendFailure(res, 409, 'Ya existe una cuenta con esa cédula.');
      throw error;
    }
  });

  app.get('/eficient-parking-lot/me', authenticate, (req, res) => res.json({ success: true, user: publicUser(req.user) }));

  app.post('/eficient-parking-lot/espacios.php', authenticate, requireRole('student'), (req, res) => {
    expireReservations();
    const zoneId = Number(req.body.zona);
    const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(zoneId);
    if (!zone || zone.vehicle_type !== req.user.vehicle_type) return sendFailure(res, 400, 'La zona no corresponde a tu tipo de vehículo.');
    const spaces = db.prepare(`
      SELECT s.id, CAST(s.number AS TEXT) AS numero
      FROM parking_spaces s
      WHERE s.zone_id = ? AND NOT EXISTS (
        SELECT 1 FROM reservations r WHERE r.space_id = s.id AND r.status = 'active'
      )
      ORDER BY s.number
    `).all(zoneId);
    return res.json({ success: true, espacios: spaces });
  });

  app.post('/eficient-parking-lot/reserva_activa.php', authenticate, requireRole('student'), (req, res) => {
    expireReservations();
    const reservation = activeReservationForUser(req.user.id);
    if (!reservation) return res.json({ success: true, reserva: null });
    return res.json({
      success: true,
      reserva: {
        numero: String(reservation.number),
        zona: reservation.zone_id,
        zonaNombre: reservation.zone_name,
        horaVencimiento: reservation.expires_at,
      },
    });
  });

  app.post('/eficient-parking-lot/reservar.php', authenticate, requireRole('student'), (req, res) => {
    expireReservations();
    const space = asSpace(req.body.idEspacio);
    if (!space || space.vehicle_type !== req.user.vehicle_type) return sendFailure(res, 400, 'El espacio no es válido para tu vehículo.');
    if (activeReservationForUser(req.user.id)) return sendFailure(res, 409, 'Ya tienes una reserva activa.');
    const current = db.prepare("SELECT id FROM reservations WHERE space_id = ? AND status = 'active'").get(space.id);
    if (current) return sendFailure(res, 409, 'Ese espacio ya fue reservado. Actualiza la disponibilidad.');
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    try {
      const reservationId = db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO reservations (user_id, space_id, status, created_at, expires_at)
          VALUES (?, ?, 'active', ?, ?)
        `).run(req.user.id, space.id, createdAt, expiresAt);
        eventFor(result.lastInsertRowid, 'reserved');
        return result.lastInsertRowid;
      })();
      return res.status(201).json({ success: true, id: reservationId, horaVencimiento: expiresAt });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return sendFailure(res, 409, 'El espacio o usuario ya tiene una reserva activa.');
      throw error;
    }
  });

  app.post('/eficient-parking-lot/cancelar.php', authenticate, requireRole('student'), (req, res) => {
    const reservation = activeReservationForUser(req.user.id);
    if (!reservation) return sendFailure(res, 404, 'No tienes una reserva activa.');
    db.transaction(() => {
      db.prepare("UPDATE reservations SET status = 'cancelled', ended_at = ? WHERE id = ?").run(nowIso(), reservation.id);
      eventFor(reservation.id, 'cancelled');
    })();
    return res.json({ success: true, message: 'Reserva cancelada.' });
  });

  app.get('/eficient-parking-lot/admin_espacios.php', authenticate, requireRole('admin', 'security'), (_req, res) => {
    expireReservations();
    const rows = db.prepare(`
      SELECT s.id, s.number, s.zone_id, z.vehicle_type, z.name AS zone_name,
        u.name AS user_name, u.cedula, u.plate, r.expires_at
      FROM parking_spaces s
      JOIN zones z ON z.id = s.zone_id
      LEFT JOIN reservations r ON r.space_id = s.id AND r.status = 'active'
      LEFT JOIN users u ON u.id = r.user_id
      ORDER BY s.zone_id, s.number
    `).all();
    const libres = [];
    const ocupados = [];
    const porVencer = [];
    for (const row of rows) {
      const space = {
        id: String(row.id),
        numero: String(row.number),
        zonaId: String(row.zone_id),
        zonaNombre: row.zone_name,
        tipoVehiculo: row.vehicle_type === 'motorcycle' ? 'moto' : 'carro',
        tipoZona: row.vehicle_type === 'motorcycle' ? 'moto' : 'carro',
        estado: 'libre',
      };
      if (row.user_name) {
        Object.assign(space, {
          nombre: row.user_name,
          cedula: row.cedula,
          placa: row.plate,
          horaVencimiento: row.expires_at,
        });
        const soon = row.expires_at && new Date(row.expires_at).getTime() - Date.now() <= 5 * 60_000;
        space.estado = soon ? 'por vencer' : 'ocupado';
        (soon ? porVencer : ocupados).push(space);
      } else {
        libres.push(space);
      }
    }
    return res.json({ success: true, libres, ocupados, porVencer });
  });

  app.post('/eficient-parking-lot/buscar_placa_activa.php', authenticate, requireRole('security', 'admin'), (req, res) => {
    expireReservations();
    const key = String(req.body.cedula || req.body.placa || '').trim().toUpperCase();
    const match = db.prepare(`
      SELECT u.*, s.number, s.zone_id, r.expires_at
      FROM users u JOIN reservations r ON r.user_id = u.id
      JOIN parking_spaces s ON s.id = r.space_id
      WHERE r.status = 'active' AND (UPPER(u.plate) = ? OR u.cedula = ?)
    `).get(key, key);
    if (!match) return res.json({ success: true, tieneParqueadero: false });
    return res.json({
      success: true,
      tieneParqueadero: true,
      usuario: {
        ...publicUser(match),
        nombre: match.name,
        numero: String(match.number),
        zonaId: String(match.zone_id),
        horaVencimiento: match.expires_at,
      },
    });
  });

  app.post('/eficient-parking-lot/buscar_usuario_placa.php', authenticate, requireRole('security', 'admin'), (req, res) => {
    const key = String(req.body.cedula || req.body.placa || '').trim().toUpperCase();
    const user = db.prepare('SELECT * FROM users WHERE UPPER(plate) = ? OR cedula = ?').get(key, key);
    return res.json(user
      ? { success: true, registrado: true, usuario: publicUser(user) }
      : { success: true, registrado: false });
  });

  app.post('/eficient-parking-lot/crear_visitante.php', authenticate, requireRole('security', 'admin'), (req, res) => {
    const plate = String(req.body.placa || '').trim().toUpperCase();
    if (!plate) return sendFailure(res, 400, 'Ingresa una placa válida.');
    let user = db.prepare("SELECT * FROM users WHERE UPPER(plate) = ? AND role = 'visitor'").get(plate);
    if (!user) {
      const result = db.prepare(`
        INSERT INTO users (cedula, name, password_hash, role, plate, vehicle_type, created_at)
        VALUES (?, ?, ?, 'visitor', ?, 'car', ?)
      `).run(`VIS-${crypto.randomUUID()}`, `Visitante ${plate}`, bcrypt.hashSync(crypto.randomUUID(), 10), plate, nowIso());
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }
    return res.json({ success: true, usuario: { ...publicUser(user), nombre: user.name } });
  });

  app.post('/eficient-parking-lot/asignar_usuario.php', authenticate, requireRole('security', 'admin'), (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.body.usuarioId));
    const space = asSpace(req.body.espacioId);
    if (!user || !space) return sendFailure(res, 404, 'No se encontró el usuario o el espacio.');
    const reserved = db.prepare("SELECT id FROM reservations WHERE status = 'active' AND space_id = ?").get(space.id);
    if (reserved) return sendFailure(res, 409, 'El espacio ya está ocupado.');
    try {
      const id = db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO reservations (user_id, space_id, status, created_at, expires_at)
          VALUES (?, ?, 'active', ?, ?)
        `).run(user.id, space.id, nowIso(), new Date(Date.now() + 12 * 60 * 60_000).toISOString());
        eventFor(result.lastInsertRowid, 'assigned');
        return result.lastInsertRowid;
      })();
      return res.status(201).json({ success: true, id });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return sendFailure(res, 409, 'El usuario ya tiene un espacio activo.');
      throw error;
    }
  });

  app.post('/eficient-parking-lot/asignar_visitante.php', authenticate, requireRole('security', 'admin'), (req, res) => {
    const plate = String(req.body.placa || '').trim().toUpperCase();
    const name = String(req.body.nombre || '').trim();
    const space = asSpace(req.body.espacioId);
    if (!plate || !name || !space) return sendFailure(res, 400, 'Nombre, placa y espacio son obligatorios.');
    let user = db.prepare("SELECT * FROM users WHERE UPPER(plate) = ? AND role = 'visitor'").get(plate);
    if (!user) {
      const result = db.prepare(`
        INSERT INTO users (cedula, name, password_hash, role, plate, vehicle_type, created_at)
        VALUES (?, ?, ?, 'visitor', ?, ?, ?)
      `).run(`VIS-${crypto.randomUUID()}`, name, bcrypt.hashSync(crypto.randomUUID(), 10), plate, space.vehicle_type, nowIso());
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }
    try {
      const id = db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO reservations (user_id, space_id, status, created_at, expires_at)
          VALUES (?, ?, 'active', ?, ?)
        `).run(user.id, space.id, nowIso(), new Date(Date.now() + 12 * 60 * 60_000).toISOString());
        eventFor(result.lastInsertRowid, 'visitor_assigned');
        return result.lastInsertRowid;
      })();
      return res.status(201).json({ success: true, id });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return sendFailure(res, 409, 'El espacio o visitante ya tiene una asignación activa.');
      throw error;
    }
  });

  app.post('/eficient-parking-lot/historial.php', authenticate, (req, res) => {
    const userId = req.user.role === 'student' ? req.user.id : Number(req.body.userId || req.user.id);
    const rows = db.prepare(`
      SELECT r.created_at, r.ended_at, r.status, s.number, z.name AS zone_name, u.plate
      FROM reservations r
      JOIN parking_spaces s ON s.id = r.space_id
      JOIN zones z ON z.id = s.zone_id
      JOIN users u ON u.id = r.user_id
      WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 100
    `).all(userId);
    return res.json({
      success: true,
      historial: rows.map((row) => ({
        id: `${row.created_at}-${row.number}`,
        fecha: row.created_at,
        horaIngreso: new Date(row.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        horaSalida: row.ended_at ? new Date(row.ended_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : null,
        zona: row.zone_name,
        espacio: String(row.number),
        placa: row.plate,
        estado: row.status,
      })),
    });
  });

  app.post('/eficient-parking-lot/actualizar_usuario.php', authenticate, (req, res) => {
    const name = String(req.body.nombre || '').trim();
    if (!name) return sendFailure(res, 400, 'El nombre es obligatorio.');
    const plate = req.user.role === 'student'
      ? String(req.body.placa ?? req.user.plate).trim().toUpperCase()
      : req.user.plate;
    db.prepare('UPDATE users SET name = ?, plate = ? WHERE id = ?').run(name, plate, req.user.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    return res.json({ success: true, user: publicUser(user) });
  });

  app.post('/eficient-parking-lot/verificar_usuario.php', (_req, res) => (
    sendFailure(res, 503, 'La recuperación de contraseña no está habilitada: falta configurar un canal seguro de verificación.')
  ));

  app.post('/eficient-parking-lot/cambiar_contrasena.php', (_req, res) => (
    sendFailure(res, 503, 'La recuperación de contraseña no está habilitada: contacta al administrador del sistema.')
  ));

  app.get('/api/dashboard/overview', authenticate, requireRole('admin'), (_req, res) => {
    expireReservations();
    const zones = db.prepare(`
      SELECT z.id, z.name AS nombre, z.vehicle_type AS tipoVehiculo, z.capacity AS capacidad,
        COUNT(r.id) AS ocupados
      FROM zones z
      JOIN parking_spaces s ON s.zone_id = z.id
      LEFT JOIN reservations r ON r.space_id = s.id AND r.status = 'active'
      GROUP BY z.id ORDER BY z.id
    `).all().map((zone) => ({
      ...zone,
      tipoVehiculo: zone.tipoVehiculo === 'motorcycle' ? 'moto' : 'carro',
      disponibles: zone.capacidad - zone.ocupados,
    }));
    const active = db.prepare("SELECT COUNT(*) AS count FROM reservations WHERE status = 'active'").get().count;
    const total = db.prepare('SELECT COUNT(*) AS count FROM parking_spaces').get().count;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const events = db.prepare(`
      SELECT event_type, COUNT(*) AS count FROM parking_events WHERE created_at >= ? GROUP BY event_type
    `).all(startOfDay);
    const hourly = db.prepare(`
      SELECT CAST(strftime('%H', created_at) AS INTEGER) AS hour, COUNT(*) AS count
      FROM parking_events
      WHERE event_type IN ('reserved', 'assigned', 'visitor_assigned') AND created_at >= ?
      GROUP BY hour ORDER BY hour
    `).all(startOfDay);
    const vehicleMix = db.prepare(`
      SELECT z.vehicle_type AS tipo, COUNT(r.id) AS total
      FROM reservations r JOIN parking_spaces s ON s.id = r.space_id
      JOIN zones z ON z.id = s.zone_id
      WHERE r.created_at >= ? GROUP BY z.vehicle_type
    `).all(new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString())
      .map((row) => ({ tipo: row.tipo === 'motorcycle' ? 'Motos' : 'Carros', total: row.total }));
    return res.json({
      success: true,
      actualizado: nowIso(),
      metricas: {
        capacidad: total,
        ocupados: active,
        disponibles: total - active,
        ocupacionPct: total ? Math.round(active * 100 / total) : 0,
        eventosHoy: events.reduce((sum, row) => sum + row.count, 0),
      },
      zonas: zones,
      actividadPorHora: hourly,
      vehiculosUltimos7Dias: vehicleMix,
    });
  });

  app.use((_req, res) => sendFailure(res, 404, 'Ruta no encontrada.'));
  app.use((error, _req, res, _next) => {
    console.error('API request failed:', error);
    return sendFailure(res, 500, 'Error interno del servidor.');
  });

  return app;
}

if (require.main === module) {
  const db = openDatabase();
  const app = createApp(db);
  const server = app.listen(appPort, listenHost, () => {
    console.log(`Efficient Parking API listening on port ${appPort}`);
  });
  const shutdown = () => server.close(() => {
    db.close();
    process.exit(0);
  });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { createApp };
