# Guía de estudio completa — Eficient Parking

## Manual para comprender, ejecutar, explicar y entregar el proyecto

**Aplicación de gestión de parqueaderos para la Universidad de Cundinamarca**  
Plataformas: web y Android · Aplicación: Expo, React Native y TypeScript · Backend: Node.js y Express · Persistencia: SQLite

---

## Cómo usar esta guía

Este manual está escrito para estudiar y presentar el código que existe en este repositorio, no una versión ideal o imaginaria. Léelo en este orden:

1. Comprende el propósito y el estado real del producto.
2. Aprende la arquitectura y cómo inicia cada componente.
3. Sigue los recorridos de autenticación, reserva, seguridad y dashboard.
4. Familiarízate con el esquema de datos, los endpoints y las pruebas.
5. Practica ejecutar el sistema localmente y explicar sus límites.
6. Completa la lista de entrega y los pendientes antes de afirmar que está desplegado.

Los nombres de archivo citados están en el repositorio. Si cambias un endpoint o una regla, vuelve a comprobar esta guía y las pruebas: la documentación debe seguir el comportamiento real.

## 1. Resumen ejecutivo del proyecto

Eficient Parking es un prototipo para administrar cupos de parqueadero. Una aplicación construida con Expo ofrece interfaces que se ejecutan en navegador y Android. Estas interfaces se conectan a un backend HTTP en Node.js/Express; el backend autentica usuarios, aplica permisos, actualiza reservas y consulta una base SQLite. Por eso, los clientes no deberían decidir por su cuenta si un espacio está disponible: consultan al servidor, que es quien tiene la última palabra.

El dominio inicial tiene cinco zonas y 125 espacios: Administrativa (25), Biblioteca (20), Auditorio (20), Cafetería (30) y Laboratorios (30). Las tres primeras están destinadas a carros y las dos últimas a motocicletas, de acuerdo con los datos iniciales de [backend/database.cjs](./backend/database.cjs). El sistema incluye cuentas de estudiante, administración y seguridad; los visitantes que registra seguridad también se almacenan internamente como usuarios de tipo `visitor`.

### Qué está implementado

- Registro de estudiantes, inicio de sesión y autorización por roles.
- Consulta de cupos, reserva, consulta de reserva activa, cancelación y expiración.
- Generación visual de un QR en la interfaz de estudiante y comprobación de la reserva activa por el personal de seguridad.
- Consulta del estado de zonas y espacios, búsqueda por cédula o placa y asignación por seguridad.
- Registro y asignación de visitantes.
- Historial, edición de perfil y dashboard de ocupación para administración.
- Exportación estática web y pruebas de integración de los recorridos principales.

Las funcionalidades se ejecutan localmente cuando la API está iniciada y los clientes apuntan a ella. Tener el código no significa que haya un sitio en producción, una base de datos en la nube o un APK publicado.

### Estado honesto de la entrega en la nube

El intento anterior de crear el servicio gratuito en Azure terminó con el sitio deshabilitado por `QuotaExceeded`; Azure devolvió “Site Disabled”. La web y la API **no están publicadas de manera funcional** y no se produjo un APK. La cuenta de prueba mencionada en el historial anterior reside en una base local, ignorada por Git, no en una base de datos pública. No presentar el sitio como desplegado ni distribuir una dirección como si estuviera activa.

El plan F1 descrito por el repositorio es gratuito y limitado, sin SLA, adecuado para aprendizaje y demostración, no para producción. No se debe cambiar a un plan de pago sin autorización explícita. Antes de reintentar se necesita que Azure resuelva la cuota y confirme que el plan gratuito puede activarse.

### Requisitos académicos y situación

| Requisito solicitado | Evidencia en el proyecto | Situación |
|---|---|---|
| Prototipo funcional con mínimo ocho funcionalidades | Los flujos de usuario, administración y seguridad descritos arriba; las pruebas cubren varios flujos de API | Implementado parcialmente y demostrable en local; validar cada flujo antes de prometerlo |
| Web y móvil conectados a una base común | Expo Web/Android consultan la API; el backend usa SQLite | Implementado para desarrollo local; Azure no está operativo |
| Móvil consumiendo API del backend | `fetch` en las pantallas y rutas en `backend/server.cjs` | Implementado |
| Análisis exploratorio visualizado en dashboard | Métricas por zona, eventos por hora y demanda por tipo de vehículo | Dashboard funcional para administrador; es un tablero operativo básico, no un análisis estadístico exhaustivo |
| Despliegue en Azure/AWS/similar | Script `deploy/azure-free.ps1` y despliegue intentado en Azure | Pendiente: la instancia Azure quedó `QuotaExceeded` |
| Enlace público y APK | El script intenta publicar la web; EAS define perfil APK | Pendientes: no hay URL operativa ni APK generado en este estado |

## 2. Mapa de arquitectura

```text
Navegador (Expo Web) ──────┐
                           ├── HTTP/JSON ──> Express (backend/server.cjs)
Android (Expo/RN) ─────────┘                       │
                                                  ├── bcryptjs: contraseñas
                                                  ├── jsonwebtoken: sesiones
                                                  └── better-sqlite3
                                                         │
                                                  parking.sqlite
```

En local, la web y Android pueden compartir el mismo proceso de API y el mismo archivo SQLite. En el despliegue pretendido, el servidor sirve tanto los archivos web exportados como la API, y el archivo SQLite se guardaría en el almacenamiento persistente de App Service. Esa es una arquitectura de prototipo de una instancia; no equivale a un servicio de base de datos administrado ni a una arquitectura con alta disponibilidad.

### Responsabilidad de cada capa

**Interfaz (frontend).** Recoge entradas, presenta mensajes, navega y dibuja datos. Sus pantallas envían solicitudes HTTP y guardan información de sesión en el dispositivo. La interfaz puede mejorar la experiencia, pero no es una frontera de seguridad.

**API/backend.** Recibe JSON, valida identidad y rol, aplica reglas de negocio, consulta la base y forma respuestas JSON. La API es la fuente de verdad para disponibilidad, autenticación y permisos.

**Persistencia.** SQLite guarda cuentas, zonas, espacios, reservas y eventos. Las restricciones e índices únicos impiden dos reservas activas simultáneas para el mismo espacio o usuario.

### Tecnologías y vocabulario

- **Expo SDK 54**: herramientas y runtime de desarrollo para aplicaciones React Native.
- **React Native**: componentes e interfaces declarativas para Android; `react-native-web` permite reutilizar la interfaz en navegador.
- **Expo Router**: navegación basada en archivos dentro de `app/`.
- **TypeScript**: JavaScript con tipos estáticos que ayuda a detectar errores antes de ejecutar.
- **Node.js**: entorno de ejecución del servidor.
- **Express**: enrutamiento HTTP y middleware.
- **SQLite / better-sqlite3**: base de datos relacional local basada en archivo, consultada sincrónicamente desde Node.
- **bcryptjs**: hash de contraseñas; guarda un hash, no la contraseña en texto claro.
- **JWT**: token firmado que el servidor verifica en cada solicitud protegida.
- **Zustand / AsyncStorage**: estado de sesión de la app y su almacenamiento persistente en el cliente.
- **EAS Build**: servicio de Expo para compilar paquetes Android, incluido APK para distribución interna.

## 3. Estructura del repositorio y archivos importantes

| Ruta | Qué contiene | Qué debes poder explicar |
|---|---|---|
| `app/` | Rutas/pantallas Expo Router | Cómo se navega y qué operaciones ofrece cada rol |
| `app/_layout.tsx` | Layout y configuración de navegación | Qué pantallas son parte del árbol de navegación y qué protección existe |
| `app/index.tsx` | Pantalla inicial | Punto de entrada visible según la ruta configurada |
| `app/login.tsx` | Formulario y llamada de login | Cédula/contraseña, respuesta y redirección por rol |
| `app/registro.tsx` | Formulario de creación de cuenta | Validaciones, términos, datos del vehículo y restricción de roles |
| `app/student.tsx` | Flujo principal de estudiante | Zonas, cupos, reserva, QR, temporizador y cancelación |
| `app/security.tsx` | Operación de seguridad | Cámara, búsqueda, comprobación y asignaciones |
| `app/admin.tsx` | Vista operativa de administración | Estado de zonas y navegación al dashboard |
| `app/zona-admin.tsx` | Detalle de una zona | Lectura periódica de espacios y su estado |
| `app/dashboard.tsx` | Dashboard analítico | Métricas, gráficos y actualización automática |
| `app/historial.tsx` | Historial del usuario | Solicitud autenticada y presentación de reservas anteriores |
| `app/editar-perfil.tsx` | Edición de perfil | Actualización del nombre y, para estudiantes, de la placa |
| `app/recuperar-contrasena.tsx` | Interfaz de recuperación | Existe una pantalla, pero la API rechaza este flujo con HTTP 503 |
| `constants/config.ts` | URL de la API y dashboard | Cómo se construyen las direcciones a partir de `EXPO_PUBLIC_API_URL` |
| `store/useAuthStore.ts` | Sesión global Zustand | Usuario/token persistidos, cierre de sesión y cabecera Bearer |
| `types/parking.ts` | Tipos del dominio frontend | Formas de `User`, `ParkingZone`, `ParkingSpace` y `Reservation` |
| `services/auth.ts` | Servicio de autenticación antiguo | Usa el mock local; no confundirlo con login real por API |
| `services/database.ts` | Datos de ejemplo en memoria | Mock de usuarios, zonas y reservas; no es la base persistente real |
| `context/AuthContext.tsx` | Contexto React de auth antiguo | Capa heredada que depende del servicio mock |
| `context/ParkingContext.tsx` | Contexto React de parqueo antiguo | Zonas basadas en el mock de `services/database.ts` |
| `backend/server.cjs` | Aplicación Express y endpoints | Middleware, autenticación, permisos, reglas, respuestas y web estática |
| `backend/database.cjs` | Esquema, semillas y bootstrap | Tablas, índices, zonas, datos demo y cuenta inicial opcional |
| `backend/server.test.cjs` | Pruebas automatizadas de API | Casos de registro, reserva, autorización, seguridad y web estática |
| `backend/package.json` | Dependencias y script de pruebas del servidor | Cómo iniciar API y ejecutar Node Test Runner |
| `package.json` | Dependencias/comandos frontend | Comandos Expo, lint y scripts de conveniencia |
| `app.json` | Identidad y configuración Expo | Nombre, rutas web, Android, icono y plugins |
| `eas.json` | Perfiles de compilación EAS | Perfil `preview` interno en APK y perfil de producción |
| `.env.example` | Variables documentadas | URL pública/local, puerto, base, JWT y claves opcionales |
| `deploy/azure-free.ps1` | Automatización del despliegue | Exportar web, preparar paquete, configurar App Service F1 y comprobar URL |
| `README.md` | Inicio rápido y notas del proyecto | Comandos de desarrollo, validación y límites del plan gratuito |

### Código activo frente a código de demostración heredado

Las pantallas principales consultan la API por HTTP y guardan sesión en `store/useAuthStore.ts`. Por otra parte, `services/database.ts`, `services/auth.ts`, `context/AuthContext.tsx` y `context/ParkingContext.tsx` implementan datos simulados en memoria: usuarios predefinidos, espacios generados aleatoriamente y tokens que no son JWT de servidor. Son piezas heredadas/demo y **no** representan la base SQLite usada por los flujos actuales de API. Al exponer el proyecto, sigue el camino real: pantalla → `fetch` → endpoint → SQLite. Si se decide eliminar el código antiguo, primero verifica todas sus referencias y realiza la limpieza en un cambio independiente.

## 4. Cómo ejecutar y verificar en local

### Requisitos

- Node.js 20 o superior.
- npm.
- Una terminal en la carpeta raíz del repositorio.
- Para compilar o ejecutar Android en dispositivo: entorno Expo/Android adecuado; un teléfono debe poder alcanzar la dirección de la computadora.

### Instalación y arranque

```powershell
npm install
npm ci --prefix backend
npm run api
```

La API escucha normalmente en el puerto 4000. Déjala abierta. En otra terminal:

```powershell
npm run web
```

Para ejecutar la app Android localmente:

```powershell
npm run android
```

Configura antes `EXPO_PUBLIC_API_URL` con una URL que el dispositivo pueda alcanzar. El valor predeterminado es `http://localhost:4000/eficient-parking-lot`: funciona en el navegador de la misma computadora y puede funcionar en ciertos emuladores, pero `localhost` en un teléfono físico se refiere al propio teléfono, no al PC. En ese caso, usa la IP local del computador y asegúrate de que estén en la misma red y que el firewall permita el puerto. No publiques esa URL como si fuera producción.

Variables relevantes:

| Variable | Uso |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL base consumida por la app; lo que empieza por `EXPO_PUBLIC_` queda disponible en el paquete frontend |
| `PORT` | Puerto de Express; por defecto 4000 |
| `HOST` | Interfaz de red de escucha |
| `SQLITE_PATH` | Ruta del archivo de base de datos |
| `SQLITE_JOURNAL_MODE` | Modo de journal; `DELETE` está contemplado para Azure |
| `JWT_SECRET` | Secreto de firma JWT; debe ser aleatorio y privado en producción |
| `DEMO_DATA` | Controla si se crean cuentas demo; el despliegue lo pone en `false` |
| `ADMIN_REGISTRATION_KEY`, `SECURITY_REGISTRATION_KEY` | Claves opcionales de autorización para registrar personal |
| `BOOTSTRAP_ADMIN_ID`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` | Crean/actualizan la cuenta administrativa inicial al arrancar |

No agregues `.env`, contraseñas, tokens, claves de registro ni la base de datos con usuarios reales al control de versiones. Comprueba que los archivos locales con información personal están ignorados antes de hacer `git add`.

### Validaciones del repositorio

```powershell
npm run api:test
npx tsc --noEmit
npm run lint
npx expo export --platform web
```

La prueba de API usa una base SQLite temporal y un servidor local. No requiere desplegar ni altera la base cotidiana. `tsc` revisa los tipos; lint revisa reglas y formato acordados; `expo export` verifica que se pueda producir el bundle web. Un test verde demuestra esos casos, no la disponibilidad de Azure, la calidad del APK ni todas las interacciones visuales.

### Cuentas demo

En desarrollo, `backend/database.cjs` crea cuentas de ejemplo si `NODE_ENV` no es producción y `DEMO_DATA` no es `false`. El README de desarrollo contiene los datos de inicio de sesión de esas cuentas. Son exclusivamente para pruebas locales, nunca se deben usar en producción ni copiar a una base pública. En Azure el script establece `DEMO_DATA=false` y crea una cuenta de administración separada usando valores aleatorios de bootstrap.

## 5. Flujo de una solicitud y de autenticación

### Registro

1. La pantalla `app/registro.tsx` obtiene nombre, cédula, contraseña, rol y, para estudiantes, placa/tipo de vehículo.
2. El usuario debe aceptar los términos; la pantalla envía esa aceptación como `aceptaTerminos`.
3. El frontend envía JSON mediante `POST /eficient-parking-lot/registro.php`.
4. Express valida campos, longitud mínima de contraseña (ocho caracteres), placa de estudiante, términos y rol.
5. El alta pública solo admite estudiantes. Los roles `admin` y `security` requieren clave de registro válida configurada en servidor.
6. `bcryptjs` crea el hash; SQLite impone cédula única.
7. El backend devuelve un usuario público y un JWT. En caso de éxito, la pantalla dirige al login con indicación de registro completado.

No todo rechazo es un error de red: puede ser un `400` por validación, `403` por falta de autorización o `409` por cédula repetida. La interfaz debe mostrar el mensaje del servidor.

### Inicio de sesión y sesión persistente

1. `app/login.tsx` manda cédula y contraseña al endpoint `login.php`.
2. El backend consulta el usuario y verifica la contraseña contra `password_hash` usando bcrypt.
3. Si son válidas, firma un JWT con identidad/rol, emisor `efficient-parking-api` y expiración de 12 horas.
4. El frontend guarda usuario y token mediante `useAuthStore`; Zustand usa AsyncStorage para conservar estado en el cliente.
5. `getAuthHeaders()` produce `Authorization: Bearer <token>`.
6. El servidor verifica la firma y expiración, vuelve a buscar el usuario y adjunta su identidad a la solicitud.
7. `requireRole(...)` comprueba los permisos del endpoint; la interfaz también redirige a la pantalla correspondiente.

La protección de rutas en el cliente mejora la experiencia, pero el servidor debe verificar el token y el rol en cada endpoint. El token JWT es una credencial: no se registra en consola, no se comparte y no se incluye en capturas.

### Reserva de estudiante

1. `app/student.tsx` comprueba si la sesión y el rol son compatibles.
2. El usuario elige una zona según su vehículo; la lista de espacios llega de `espacios.php`.
3. Al reservar, el cliente envía el identificador del espacio a `reservar.php`.
4. El servidor comprueba que la zona corresponda al tipo de vehículo y que espacio/usuario no tengan una reserva activa.
5. La base de datos impone índices únicos parciales para reservar atómicamente un solo espacio por persona y evitar competir por el mismo cupo.
6. El backend registra el evento, entrega la expiración y responde.
7. El cliente muestra un temporizador y el QR. Cancelar llama a `cancelar.php`; al consultar endpoints, el backend vence reservas cuyo tiempo pasó y registra el evento.

La regla del backend es la fuente de verdad de expiración. El temporizador en el teléfono solo es una representación visual. En el esquema el estado interno es `active`, `cancelled`, `completed` o `expired`; la API adapta algunos nombres para la interfaz.

### Seguridad y visitantes

La pantalla de seguridad usa `expo-camera`, puede buscar por cédula o placa y consulta si la identidad está registrada o tiene un espacio activo. El endpoint `buscar_placa_activa.php` consulta el estado en el servidor. Si el visitante no existe, la app puede crearlo y luego asignarle un espacio.

El QR de estudiante se construye en el cliente con texto identificador que contiene nombre, cédula y número de espacio; el personal de seguridad usa esos datos para consultar una reserva activa. No lo describas como un QR firmado o secreto: el valor visual no es en sí mismo una prueba criptográfica. La verificación útil es la consulta autenticada al backend. Una mejora de privacidad sería que el QR contuviera un identificador opaco y aleatorio, no datos personales.

Las asignaciones de personal tienen una vigencia de 12 horas en el código actual, mientras que la reserva de estudiante se configura a 15 minutos. No confundas ambas reglas al presentar el sistema.

### Dashboard

`app/dashboard.tsx` pide `GET /api/dashboard/overview` con token y refresca cada cinco segundos. El endpoint exige rol administrador y devuelve:

- Capacidad, ocupados, disponibles y porcentaje de ocupación.
- Cupos ocupados/disponibles por zona.
- Eventos del día agregados por tipo y actividad agrupada por hora.
- Distribución por tipo de vehículo de las reservas creadas durante los últimos siete días.

Los gráficos se dibujan en el cliente con `react-native-svg`. Es un dashboard operativo que consulta métricas agregadas; no se debe confundir con un análisis exploratorio formal con limpieza de un conjunto de datos, estadística descriptiva profunda, hipótesis o modelos predictivos. Para ampliar ese requisito, documenta el origen y calidad de los datos, periodo, métricas, hallazgos y decisiones.

## 6. API: endpoints y respuestas

La ruta base de desarrollo es `http://localhost:4000/eficient-parking-lot`. Salvo login/registro, las solicitudes privadas deben enviar token como cabecera Bearer; el servidor también admite `token` en algunos lugares del cuerpo o query para compatibilidad. Preferir siempre la cabecera.

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| GET | `/health` | Público | Verifica que el proceso de API responde |
| POST | `/eficient-parking-lot/login.php` | Público | Autentica cédula/contraseña y devuelve token |
| POST | `/eficient-parking-lot/registro.php` | Público + validaciones | Crea estudiante; personal requiere clave autorizada |
| GET | `/eficient-parking-lot/me` | Usuario autenticado | Devuelve identidad asociada al token |
| POST | `/eficient-parking-lot/espacios.php` | Estudiante | Lista cupos disponibles por zona compatible |
| POST | `/eficient-parking-lot/reserva_activa.php` | Estudiante | Recupera reserva activa |
| POST | `/eficient-parking-lot/reservar.php` | Estudiante | Crea reserva de 15 minutos |
| POST | `/eficient-parking-lot/cancelar.php` | Estudiante | Cancela su reserva activa |
| GET | `/eficient-parking-lot/admin_espacios.php` | Admin/seguridad | Lista espacios libres, ocupados y próximos a vencer |
| POST | `/eficient-parking-lot/buscar_placa_activa.php` | Admin/seguridad | Comprueba reserva activa por placa o cédula |
| POST | `/eficient-parking-lot/buscar_usuario_placa.php` | Admin/seguridad | Busca usuario por placa o cédula |
| POST | `/eficient-parking-lot/crear_visitante.php` | Admin/seguridad | Registra visitante por placa |
| POST | `/eficient-parking-lot/asignar_usuario.php` | Admin/seguridad | Asigna espacio a usuario |
| POST | `/eficient-parking-lot/asignar_visitante.php` | Admin/seguridad | Crea/asigna visitante a espacio |
| POST | `/eficient-parking-lot/historial.php` | Autenticado | Devuelve historial de reservas |
| POST | `/eficient-parking-lot/actualizar_usuario.php` | Autenticado | Actualiza perfil de la cuenta actual |
| GET | `/api/dashboard/overview` | Admin | Devuelve datos agregados del dashboard |
| POST | `/eficient-parking-lot/verificar_usuario.php` | Público | Responde 503: recuperación deshabilitada |
| POST | `/eficient-parking-lot/cambiar_contrasena.php` | Público | Responde 503: recuperación deshabilitada |

En general, éxito devuelve JSON con `success: true`; los rechazos devuelven un código HTTP apropiado y `success: false` con `message`. Códigos habituales: `400` solicitud incompleta/inválida, `401` sin sesión válida, `403` rol insuficiente, `404` recurso inexistente, `409` conflicto como duplicado, `503` función no habilitada. El middleware final registra errores internos y responde `500`; el frontend no debe dar por hecho que cada fallo incluye JSON válido, especialmente ante errores de red/proxy.

Ejemplo didáctico de reserva (no es una credencial real):

```http
POST /eficient-parking-lot/reservar.php
Authorization: Bearer <token_de_sesion>
Content-Type: application/json

{"idEspacio": 42}
```

### Pruebas de integración existentes

`backend/server.test.cjs` comprueba, entre otros casos: web estática junto a API; modo SQLite DELETE; alta de estudiante, token, búsqueda de espacios, reserva, historial, rechazo de segunda reserva activa, dashboard y cancelación; rechazo de registro sin términos o con rol privilegiado no autorizado; denegación de dashboard a estudiante; búsqueda/asignación por seguridad y visitante.

Las pruebas no abarcan cada pantalla ni todos los fallos de red, accesibilidad, dispositivos, zona horaria o concurrencia real en varios procesos. Una prueba funcional completa debe incluir también exploración manual en navegador y Android.

## 7. Base de datos y reglas de integridad

La base se abre en `openDatabase()` y se crea si todavía no existe. Por defecto es `backend/data/parking.sqlite`; `SQLITE_PATH` puede cambiar la ubicación. Las semillas de zonas y espacios se ejecutan como transacción y usan `INSERT OR IGNORE`.

| Tabla | Contenido y relaciones |
|---|---|
| `users` | Identidad, cédula única, nombre, hash, rol, placa, tipo de vehículo y fecha de creación |
| `zones` | Zonas, tipo de vehículo y capacidad |
| `parking_spaces` | Espacios vinculados a zona; el número es único dentro de cada zona |
| `reservations` | Usuario, espacio, estado, creación, vencimiento y finalización |
| `parking_events` | Registro de eventos asociados a reserva: reservada, asignada, cancelada, expirada, etc. |

Relaciones principales: una zona tiene muchos espacios; una cuenta puede tener muchas reservas históricas; una reserva pertenece a un usuario y un espacio; un evento puede referirse a una reserva. Las claves foráneas se activan con `PRAGMA foreign_keys = ON`.

Los índices `one_active_reservation_per_space` y `one_active_reservation_per_user` son índices únicos parciales: solo aplican cuando `status = 'active'`. Esto permite conservar el historial mientras evita duplicar reservas activas. Las transacciones agrupan cambios relacionados, como marcar cancelación y registrar su evento.

SQLite es adecuado para una demostración pequeña en un único servicio, sencillo de instalar y respaldar como archivo. Tiene límites para escalabilidad, concurrencia y operación de un servicio crítico. El plan de nube pretendido no convierte SQLite en base de datos administrada. Para producción habría que diseñar una base central como PostgreSQL, migraciones, copias de seguridad, monitorización y recuperación.

### Preguntas de datos que debes poder contestar

- ¿Qué representa una reserva activa y cómo se libera un espacio?
- ¿Qué impide que dos usuarios reserven al mismo tiempo el mismo cupo?
- ¿Cómo se distingue la caducidad de una cancelación?
- ¿Qué información personal se guarda y durante cuánto tiempo?
- ¿Cómo se respaldaría/restauraría `parking.sqlite`?
- ¿Qué datos del dashboard se agregan y qué periodo cubre cada métrica?

## 8. Web, Android y compilación APK

`app.json` declara identificador `com.jesica.eficientparkinglot`, salida web estática y plugins Expo. `eas.json` tiene un perfil `preview` que solicita APK de distribución interna y un perfil `production` que produce Android App Bundle (`.aab`), que es diferente de un APK.

Una exportación web local se genera con:

```powershell
npx expo export --platform web
```

Los archivos resultantes van a `dist/`. El backend puede servir esa carpeta como archivos estáticos y resolver rutas de pantalla. `deploy/azure-free.ps1` compila la web con `EXPO_PUBLIC_API_URL=/eficient-parking-lot`, arma el paquete con API y bundle y despliega zip. No incluyas `backend/data/parking.sqlite` ni credenciales en ese paquete.

### Preparar APK con EAS (cuando API pública esté lista)

1. Asegura que una URL HTTPS pública y operativa de API exista, y que `/health` responda.
2. Configura `EXPO_PUBLIC_API_URL` para que el APK apunte a la URL pública, no a `localhost` ni a la IP del computador.
3. Inicia sesión en Expo/EAS con la cuenta autorizada y revisa el proyecto/identidad antes de compilar.
4. Ejecuta el perfil `preview` del proyecto con Android; ese perfil está configurado como APK interno. La sintaxis habitual es `eas build --platform android --profile preview`, si EAS CLI está instalado/configurado.
5. Espera la compilación y revisa el enlace/logs proporcionados por EAS.
6. Descarga el APK, instala en un teléfono de prueba, confirma permisos de cámara y ejecuta login, reserva, QR, seguridad y desconexión.
7. Distribuye el archivo solo junto con instrucciones, versión, URL de API y advertencias de prueba.

La disponibilidad de EAS, el plan de cuenta, credenciales de firma y políticas vigentes pueden cambiar; verifícalos en la cuenta Expo antes de prometer una fecha. El estado del repositorio confirma configuración para producirlo, no que exista un artefacto ya construido. Un APK distribuido públicamente debe venir de API estable con HTTPS y datos protegidos.

### Por qué el teléfono puede no conectarse

- `localhost` apunta al dispositivo, no al computador servidor.
- El teléfono y computador pueden estar en redes distintas.
- El firewall puede bloquear el puerto.
- La URL puede carecer de HTTPS o ser incorrecta en el build.
- La API podría estar apagada o bloqueada por cuota.
- El frontend puede haber incorporado una URL antigua en el paquete; reconstruirlo después de cambiarla.

## 9. Despliegue en Azure y límites reales

El script `deploy/azure-free.ps1` intenta automatizar el proceso con Azure CLI: generar identificadores/secreto aleatorios, exportar la web, preparar zip, crear grupo y App Service Plan F1 en Mexico Central, configurar variables, desplegar, comprobar `/health` y `/login`, retirar secretos bootstrap de app settings e iniciar sesión de validación. No copia la base local ni cuentas demo. El script necesita CLI, sesión con suscripción activa, cuota F1 disponible y permisos para recursos.

### Situación conocida

La cuenta es Azure for Students y la región México Central se eligió dentro de las regiones permitidas. Azure permitió crear recursos, pero el sitio terminó deshabilitado como `QuotaExceeded`. Es un bloqueo del proveedor, no evidencia de que la API ya esté disponible. Volver a lanzar el script antes de que Azure libere cuota puede crear recursos parcialmente configurados o repetir el error.

### Lista segura antes de reintentar

1. Comprobar portal Azure y soporte/administrador universitario para conocer cuota y recursos existentes.
2. Verificar que App Service F1 sea permitido en la suscripción/región.
3. Confirmar que no se requiere pagar, escalar ni crear recursos adicionales facturables; detenerse si aparece un costo.
4. Confirmar permisos, CLI y suscripción seleccionada.
5. Revisar configuración y script vigentes, y evitar copiar una SQLite que contenga datos personales.
6. Ejecutar solo tras confirmar que el sitio no está deshabilitado y que el servicio puede iniciarse.
7. Probar `/health`, `/login`, alta controlada, conexión desde web y Android y persistencia tras reinicio.
8. Verificar logs, reinicio, backups y uso de cuota; guardar la URL real y estado comprobado.

F1 tiene cuotas y recursos compartidos; no hay SLA. Por ello es una solución de aprendizaje/demo con disponibilidad no garantizada. Si no hay cuota gratuita, las opciones seguras son solicitar habilitación a Azure/universidad o usar otra plataforma con nivel gratuito real, tras revisar límites y condiciones. Nunca convertir a un plan de pago por cuenta propia.

## 10. Seguridad, privacidad y confiabilidad

### Controles presentes

- Hash de contraseñas con bcryptjs.
- JWT firmado y con expiración.
- Middleware de autenticación y control de roles en backend.
- Alta pública limitada a estudiante y claves para personal.
- Rechazo si no se aceptan términos.
- Restricción de JSON y formularios a 100 KB.
- Consultas SQL parametrizadas con `better-sqlite3`.
- Índices y transacciones para evitar reservas activas duplicadas.
- Configuración de no exponer la cabecera `X-Powered-By`.

### Riesgos y tareas pendientes que debes saber explicar

- El backend activa CORS sin restricción de origen; en producción conviene permitir solo los dominios necesarios.
- El token se guarda en AsyncStorage. Proteger credenciales en una app real requiere evaluar almacenamiento seguro del sistema operativo, expiración/renovación y revocación.
- El QR contiene cédula y nombre en texto legible; es información personal que podría capturarse o compartirse. Sustituirlo por un nonce opaco validado por servidor.
- No se deben enviar tokens en query string; pueden aparecer en logs/historial. El backend conserva compatibilidad con query en algunas rutas.
- Los usuarios visitantes tienen una contraseña aleatoria inutilizable para login, pero el modelo comparte tabla con usuarios.
- `actualizar_usuario.php` permite que cada usuario modifique su perfil autenticado; debe revisarse validación y unicidad de placa si la regla de negocio lo exige.
- Historial: el endpoint limita el usuario estudiante a su cuenta, pero el acceso de otros roles a `userId` merece una política explícita si seguridad no debe consultar historiales ajenos.
- Recuperación de contraseña devuelve 503 intencionalmente porque no hay verificación segura. No habilitar un cambio solo con cédula: cualquier persona podría tomar otra cuenta.
- Los tipos frontend no sustituyen validaciones runtime del backend.
- SQLite en una instancia limitada exige copias de seguridad y vigilancia de almacenamiento; SQLite local no ofrece replicación/alta disponibilidad.
- No guardar en Git `.env`, secretos JWT, claves de registro, contraseñas o datos reales. Rotar cualquier credencial expuesta.
- Evita imprimir tokens y datos personales en `console.log`; revisa logs antes de publicar.

### Protección de datos y demo

Utiliza cuentas ficticias y matrículas de prueba. Obtén permiso institucional antes de procesar información real. Define propósito, acceso, conservación, eliminación, respaldo y canal para incidentes. Una URL pública y un hash de contraseña no bastan para declarar cumplimiento legal o aptitud de producción.

## 11. Problemas frecuentes y método de diagnóstico

**La web abre pero no inicia sesión.** Revisa que `npm run api` siga activo, la URL en `constants/config.ts`/`.env`, que la ruta termine en `/eficient-parking-lot`, las credenciales de entorno correspondiente y la respuesta HTTP en herramientas de navegador.

**Android no conecta.** Cambia `localhost` por la IP local alcanzable del computador para desarrollo en teléfono, revisa la misma red, firewall, puerto y permisos. Para una app compilada usa URL pública HTTPS.

**Dice que cédula ya existe.** Comprueba si se usó en esa SQLite local; elimina datos solo si tienes autorización y es una base descartable. No manipules la base de usuarios reales.

**Un usuario no ve dashboard.** El endpoint requiere `admin`; revisa rol recibido al login y autorización del backend. No basta con abrir la ruta manualmente.

**El cupo sigue ocupado o reserva vencida.** Consulta `admin_espacios.php`, `reserva_activa.php` y los estados en la SQLite de pruebas. Los endpoints activan la limpieza de reservas expiradas; un temporizador cliente no altera la base por sí mismo.

**Recuperación de contraseña da error.** Es esperado: ambos endpoints devuelven `503` hasta integrar verificación segura.

**Azure muestra Site Disabled/QuotaExceeded.** No insistir con despliegues idénticos ni escoger plan de pago. Confirmar cuota con Azure; el sitio no es un servicio público mientras siga deshabilitado.

**Lint informa warnings.** Distingue warning de error. Corrige warnings ligados a un cambio, pero no los mezcles con cambios de funciones ajenas sin necesidad.

### Método de diagnóstico paso a paso

1. Reproduce el problema y anota plataforma, usuario ficticio, hora y acción exacta.
2. Comprueba URL, estado de API y `/health`.
3. Inspecciona la solicitud: método, ruta, código HTTP y forma JSON; no copies token.
4. Lee terminal/logs del servidor y de Expo.
5. Revisa el endpoint y prueba correspondiente.
6. Cambia una sola causa probable y repite el mismo caso.
7. Comprueba regresión en flujos relacionados y documenta el resultado.

## 12. Pruebas y matriz de aceptación

| Caso | Resultado que se debe observar |
|---|---|
| Registro con campos correctos y términos aceptados | Cuenta nueva, hash en BD, respuesta de éxito |
| Registro sin aceptar términos | Rechazo visible; no se crea cuenta |
| Cédula duplicada | Conflicto legible; no crea segundo usuario |
| Login con contraseña errada | HTTP 401 y mensaje sin datos sensibles |
| Estudiante consulta su zona | Solo espacios libres compatibles con vehículo |
| Estudiante reserva cupo libre | Reserva activa visible en app/API y en dashboard |
| Estudiante intenta segunda reserva activa | Rechazo por regla de negocio/índice |
| Reserva cancelada | Espacio vuelve a disponibilidad y evento/historial se actualiza |
| Reserva vencida | Backend deja de considerarla activa y registra expiración |
| Estudiante llama dashboard | HTTP 403 |
| Admin llama dashboard | Métricas y capacidad total consistentes |
| Seguridad busca matrícula/cédula | Devuelve estado actual y no inventa acceso |
| Seguridad registra visitante/asigna espacio | Usuario visitante y reserva quedan en base |
| Perfil | Cambios permitidos persisten tras volver a consultar |
| Recuperación de contraseña | La pantalla explica que el servicio no está habilitado |
| Web y Android simultáneos | Una reserva creada desde una plataforma se refleja en la otra |
| Azure `/health` y URL web | Solo declarar despliegue cuando ambas pruebas responden públicamente |
| APK instalado | Conecta a URL pública; se prueban permisos de cámara y flujos principales |

Para presentar evidencia, anota fecha, plataforma, versión, paso, resultado esperado/real y captura sin cédulas, placas o tokens reales. Una prueba de API local no demuestra funcionamiento de Azure; una captura de web no demuestra Android.

## 13. Ruta de aprendizaje sugerida

### Etapa 1 — Fundamentos de programación

Aprende variables, funciones, objetos, arrays, módulos, asincronía (`async`/`await`), excepciones y JSON en JavaScript. Practica leer una función de pantalla y seguir su llamada a `fetch`.

### Etapa 2 — TypeScript y React

Estudia tipos, interfaces, componentes, props, estado (`useState`), efectos (`useEffect`), callbacks y renderizado condicional. Distingue compilación estática de validación de datos en runtime.

### Etapa 3 — React Native y Expo Router

Aprende los componentes (`View`, `Text`, `TextInput`, `TouchableOpacity`, `ScrollView`), estilos, permisos de cámara, rutas por archivo, navegación y diferencias entre navegador, emulador y teléfono.

### Etapa 4 — HTTP y backend

Estudia cliente/servidor, HTTP, métodos, códigos de estado, JSON, CORS, rutas Express, middleware, validación y manejo de errores. Dibuja el recorrido de login antes de modificarlo.

### Etapa 5 — SQL y transacciones

Practica tablas, claves primarias/foráneas, restricciones, índices, joins, agregaciones, transacciones y copias SQLite. Explica cómo los índices parciales evitan reservas duplicadas.

### Etapa 6 — Autenticación y privacidad

Diferencia hash de contraseña, cifrado reversible, JWT, autenticación y autorización. Entiende amenaza del token expuesto, mínimo privilegio, datos personales y por qué la recuperación requiere verificación.

### Etapa 7 — Calidad, despliegue y operación

Ejecuta tests, lint, type-check y exportación web; aprende variables de entorno, logs, health check, APK, firma y cuotas del proveedor. No publiques hasta tener URL HTTPS probada y credenciales fuera del código.

## 14. Preguntas típicas de sustentación

**¿Por qué hay un backend si existe una app móvil?** Para centralizar reglas, identidad y estado compartido entre web y teléfono. Sin servidor central, cada cliente tendría su propia información y podría mostrar cupos inconsistentes.

**¿Cómo comparte datos la web con Android?** Ambos envían solicitudes HTTP a la misma API; el backend consulta la misma base SQLite. La URL de servicio se configura mediante `EXPO_PUBLIC_API_URL`.

**¿Dónde se valida que un estudiante no reserve dos espacios?** En el backend, en transacciones/consultas y por el índice único parcial de reservas activas por usuario.

**¿Cómo se protegen contraseñas?** El servidor almacena hash de bcryptjs; al autenticar compara el texto recibido con el hash. No guarda la contraseña original.

**¿JWT es lo mismo que rol?** No. JWT demuestra una sesión firmada; la API además debe verificar el rol y autorizar cada operación.

**¿El QR demuestra identidad criptográficamente?** No. La interfaz construye texto identificable; el servidor valida que exista reserva activa al consultar con una sesión autorizada. Conviene reemplazar los datos personales del QR por un token aleatorio opaco.

**¿El proyecto ya está en Azure?** Se intentó publicar con App Service F1 en Mexico Central, pero Azure deshabilitó el sitio por cuota (`QuotaExceeded`). No existe una URL operativa confirmada ni APK generado en este estado.

**¿Qué no está listo para producción?** Despliegue funcional, base de datos administrada/backup, recuperación de contraseña con verificación, revisión de privacidad/QR, restricciones CORS, observabilidad, pruebas ampliadas y operación/soporte.

**¿Qué significa dashboard en vivo aquí?** El cliente pide datos agregados al backend cada cinco segundos. Es actualización periódica (polling), no transmisión instantánea por WebSocket; las métricas solo reflejan lo que registra SQLite.

**¿Por qué SQLite?** Es sencilla, gratuita y suficiente para prototipo pequeño; la instancia F1 y el archivo SQLite no son una solución de disponibilidad o escalamiento para producción.

## 15. Glosario

| Término | Definición sencilla |
|---|---|
| API | Contrato de rutas y formatos que permite a la app pedir operaciones al servidor |
| Backend | Programa servidor que valida, aplica reglas y accede a datos |
| Endpoint | Dirección y método HTTP de una operación concreta |
| Frontend | Interfaz que ve y usa la persona |
| HTTP | Protocolo de solicitudes/respuestas entre cliente y servidor |
| JSON | Formato de texto estructurado usado para intercambiar datos |
| JWT | Token firmado que representa una sesión y caduca |
| Hash | Huella unidireccional; para contraseñas se usa un algoritmo adecuado como bcrypt |
| Middleware | Función Express que procesa solicitudes antes del endpoint |
| Rol | Categoría de permisos como student, admin o security |
| Persistencia | Conservación de datos tras cerrar o reiniciar la app |
| SQLite | Base relacional que se guarda normalmente en un archivo |
| Transacción | Grupo de operaciones que se confirman o revierten juntas |
| Índice | Estructura que acelera búsquedas y puede imponer unicidad |
| Expo Router | Navegación de Expo basada en archivos/rutas |
| Bundle | Archivos compilados/exportados que se distribuyen o sirven |
| APK | Paquete Android instalable, útil para distribución interna |
| AAB | Android App Bundle, formato orientado a publicación en Google Play |
| EAS | Servicios/herramientas de Expo para compilar y distribuir apps |
| Azure App Service | Servicio administrado para hospedar aplicaciones web/API |
| Cuota | Límite de recursos que una suscripción puede crear o consumir |
| Polling | Consulta repetida cada intervalo para obtener cambios recientes |
| Mock | Implementación simulada que imita datos/servicios sin backend real |
| CORS | Política del navegador que controla solicitudes web entre orígenes |
| Health check | Ruta sencilla para comprobar que un servicio responde |

## 16. Lista final de entrega del proyecto

### Producto y operación

- [ ] API en URL HTTPS pública activa y comprobada desde fuera de la red local.
- [ ] Web accesible por enlace público; anotar fecha y prueba de disponibilidad.
- [ ] Web y Android conectados al mismo backend y con prueba cruzada de datos.
- [ ] APK de `preview` generado, instalado y probado en un teléfono real.
- [ ] Cuenta de administración creada de forma segura; entregar credenciales por canal privado separado, nunca en el manual o repositorio.
- [ ] Cuenta de estudiante ficticia de demostración, con datos no personales.
- [ ] Prueba de flujos de estudiante, admin, seguridad y visitante documentada.
- [ ] Dashboard verificado con eventos de prueba identificables y métricas explicadas.
- [ ] Respaldo y procedimiento de restauración definidos.

### Ingeniería y evidencia

- [ ] `npm run api:test` pasa.
- [ ] TypeScript y lint ejecutados; warnings conocidos anotados.
- [ ] Exportación web completada.
- [ ] Evidencia separada para API, web, Android y cloud.
- [ ] Capturas y videos no exponen datos personales ni secretos.
- [ ] README tiene instrucciones y limitaciones actualizadas.
- [ ] No se incluyeron `.env`, bases locales, contraseñas, JWT ni claves en Git.
- [ ] Se distinguieron características implementadas, mock, pendientes y no disponibles.

### Bloqueos actuales que requieren resolución antes de afirmar “entrega completa”

1. Azure debe permitir activar un plan gratuito: el sitio anterior quedó deshabilitado por `QuotaExceeded`.
2. Se debe desplegar y verificar una URL pública real sin pasar a recursos pagados sin permiso.
3. Se debe compilar y probar un APK apuntando a esa URL pública.
4. La recuperación de contraseña requiere un método de verificación seguro; mientras tanto está deliberadamente deshabilitada.
5. La entrega académica debe confirmar si el dashboard operativo actual satisface el alcance de análisis exploratorio solicitado o si se necesita un informe de datos adicional.

## 17. Referencia rápida: comandos y rutas

```powershell
# API
npm run api

# Web
npm run web

# Pruebas backend
npm run api:test

# Tipos
npx tsc --noEmit

# Lint
npm run lint

# Exportación web
npx expo export --platform web

# Android local (requiere dispositivo/emulador configurado)
npm run android

# Despliegue Azure gratuito (solo cuando cuota F1 esté habilitada)
.\deploy\azure-free.ps1
```

Rutas de orientación: [README.md](./README.md), [backend/server.cjs](./backend/server.cjs), [backend/database.cjs](./backend/database.cjs), [backend/server.test.cjs](./backend/server.test.cjs), [app/](./app/), [constants/config.ts](./constants/config.ts), [store/useAuthStore.ts](./store/useAuthStore.ts), [deploy/azure-free.ps1](./deploy/azure-free.ps1).

---

**Nota de mantenimiento:** esta guía refleja el código inspeccionado al momento de su preparación. Si cambia la API, esquema, URL, proveedor, límites de Azure o configuración EAS, valida los archivos y pruebas antes de reutilizar instrucciones de despliegue. No contiene credenciales deliberadamente.
