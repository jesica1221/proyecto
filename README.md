# Eficient Parking

Prototipo de gestión de parqueaderos para la Universidad de Cundinamarca. La aplicación Expo funciona en Android y navegador; ambos clientes consumen la misma API y la misma base de datos SQLite.

## Funcionalidades implementadas

1. Registro de estudiantes y autenticación con contraseña cifrada.
2. Autorización por roles para estudiante, administración y seguridad.
3. Consulta en línea de cupos por zona y tipo de vehículo.
4. Reserva de un espacio por 15 minutos y liberación al cancelar o vencer.
5. Código QR de reserva validado contra una reserva activa en el servidor.
6. Búsqueda de usuarios y matrículas por cédula o placa.
7. Asignación de espacios a usuarios y visitantes por el personal de seguridad.
8. Historial de reservas y edición de perfil.
9. Dashboard web con ocupación por zona, actividad por hora y mezcla de vehículos; refresca cada cinco segundos.

## Ejecución local

Requisitos: Node.js 20 o superior y npm.

```sh
npm install
npm ci --prefix backend
npm run api
```

Opcionalmente copia `.env.example` a `.env` para configurar el puerto, URL móvil o claves de registro local.

En otra terminal:

```sh
npm run web
```

Para Android local, configura `EXPO_PUBLIC_API_URL` en `.env` con la URL alcanzable desde el teléfono, por ejemplo `http://192.168.1.20:4000/eficient-parking-lot`, y ejecuta `npm run android`. `localhost` funciona en navegador y emuladores con la configuración adecuada, no en un teléfono físico.

La API escucha en el puerto `4000`. La base de datos se crea en `backend/data/parking.sqlite`; las zonas y espacios iniciales se cargan automáticamente. En desarrollo se crean estos usuarios de demostración:

| Rol | Cédula | Contraseña |
|---|---|---|
| Estudiante | `1000000001` | `Demo2026!Parking` |
| Administrador | `1000000002` | `Demo2026!Parking` |
| Seguridad | `1000000003` | `Demo2026!Parking` |

No uses las cuentas de demostración en producción. El alta pública solo crea estudiantes. Para cuentas de personal usa las claves de registro `ADMIN_REGISTRATION_KEY` y `SECURITY_REGISTRATION_KEY`, o crea el administrador inicial con `BOOTSTRAP_ADMIN_ID` y `BOOTSTRAP_ADMIN_PASSWORD`.

## Validación

```sh
npm run api:test
npm run lint
npx expo export --platform web
```

## Despliegue en AWS Lightsail

El despliegue recomendado para esta entrega es una instancia Ubuntu de AWS Lightsail: aloja la API Node, el archivo de base de datos persistente y la web estática exportada. No se usa Vercel ni Supabase. El costo depende de región y tamaño de instancia; revisa la tarifa mostrada en tu cuenta antes de crearla. Para publicar se requiere una cuenta AWS, una instancia con IP estática y un dominio que controles para habilitar HTTPS.

1. Crea una instancia Ubuntu de Lightsail, asigna IP estática y apunta un dominio a esa dirección. Abre únicamente SSH y HTTP/HTTPS en el firewall.
2. Instala Node.js LTS y Nginx en la instancia. Copia el directorio `backend` y ejecuta `npm ci --omit=dev` dentro de él; para servir el frontend, copia también `dist` a Nginx. Así la instancia solo instala dependencias de la API, no el toolchain móvil/web. Los ejemplos de servicio y proxy están en `deploy/efficient-parking.service.example` y `deploy/nginx.conf.example`.
3. Crea un archivo de entorno fuera del repositorio, con `NODE_ENV=production`, `PORT=4000`, `SQLITE_PATH=/var/lib/efficient-parking/parking.sqlite`, un `JWT_SECRET` aleatorio, `BOOTSTRAP_ADMIN_ID` y una contraseña de administrador de al menos 12 caracteres. Configura permisos restringidos para ese archivo.
4. Ejecuta `npm run api` como servicio administrado por `systemd`; usa Nginx como proxy hacia `127.0.0.1:4000` para `/api/` y `/eficient-parking-lot/`, y sirve la carpeta web exportada en el dominio. Habilita TLS con Certbot.
5. En la máquina de compilación, define `EXPO_PUBLIC_API_URL=https://TU-DOMINIO/eficient-parking-lot` antes de `npx expo export --platform web`; publica el contenido de `dist` en el directorio web de Nginx.
6. Configura la misma `EXPO_PUBLIC_API_URL` en el entorno de compilación móvil antes de generar el APK. Con Expo EAS autenticado, ejecuta `npx eas-cli build --platform android --profile preview`.
7. Prueba registro/login, reserva, cancelación, validación QR, operación de seguridad y dashboard sobre el dominio HTTPS. Configura copias de seguridad de `/var/lib/efficient-parking` y snapshots de Lightsail.

El despliegue no se puede completar desde el repositorio sin acceso a una cuenta AWS, dominio y cuenta Expo EAS. No incluyas credenciales en el chat ni las subas al repositorio. SQLite en una sola instancia es apropiada para un prototipo; para alta disponibilidad o concurrencia elevada se debe migrar a PostgreSQL administrado y planificar backups/restauración.
