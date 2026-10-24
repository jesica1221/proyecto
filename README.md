# Eficient Parking

Prototipo de gestión de parqueaderos para la Universidad de Cundinamarca. La aplicación Expo funciona en Android y navegador; ambos clientes consumen la misma API y la misma base de datos SQLite.

## Guía de estudio

Consulta la [documentación integral en Word](./DOCUMENTACION-COMPLETA-EFFICIENT-PARKING.docx), la [guía completa en Markdown](./GUIA-DE-ESTUDIO.md) o descarga la [guía de estudio en Word](./GUIA-DE-ESTUDIO.docx). La documentación integral incluye los diagramas de flujo, clases, entidad-relación y casos de uso, además de capturas de ejecución local.

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

## Despliegue en Azure

El prototipo se desplegó en un Azure App Service Linux en la región **Mexico Central**. La aplicación sirve la web estática de Expo, la API y una base SQLite en `/home/data`, por lo que móvil y web usan la misma API. La URL asignada es `https://efficient-parking-3126533e.azurewebsites.net`. Verificado el 23 de octubre de 2026 tras un nuevo despliegue: `/health`, `/`, `/login` y `/student` responden 200, el bundle web ya no apunta a `localhost`, el login de administración devuelve token, `/api/dashboard/overview` responde 200 con las métricas y el asistente IA responde 401 sin sesión (503 con sesión mientras no se configure `AI_API_KEY`). Una falla anterior (`Cannot find module 'dotenv'` durante arranques en frío) se resolvió al redesplegar el paquete.

El plan de App Service existente se cambió de F1 a B1 tras agotar la cuota de F1. B1 puede tener costo: revisa Azure Cost Management y las condiciones de la suscripción antes de mantenerlo. Esta arquitectura de una instancia y SQLite es para prototipo, no para alta concurrencia ni producción crítica.

Requisitos: Azure CLI, Node.js 20 o superior, dependencias instaladas en la raíz, y una suscripción Azure activa. Desde PowerShell en la raíz del repositorio:

```powershell
az login
.\deploy\azure-free.ps1
```

El script crea un identificador y una contraseña temporales de administrador, exporta la web para consumir la API del mismo origen, despliega API y web, y comprueba `/health`, `/login` y la autenticación administrativa. Retira los valores de bootstrap de los ajustes de Azure al terminar; la cuenta permanece en la base como hash. Las credenciales de bootstrap no se guardan en el repositorio. El script no copia `backend/data` ni la base local al paquete de despliegue.

La base SQLite vive en el almacenamiento persistente de App Service, pero no es una arquitectura para alta concurrencia ni un reemplazo de backups administrados. No guardes información personal real en esta demostración. El APK se construye mediante el workflow de GitHub Actions; la última release está publicada en [apk-latest](https://github.com/jesica1221/proyecto/releases/tag/apk-latest). No se ha instalado en un teléfono físico, aunque la API de Azure a la que apunta ya responde.
