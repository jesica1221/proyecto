# Eficient Parking

Prototipo de gestión de parqueaderos para la Universidad de Cundinamarca. La aplicación Expo funciona en Android y navegador; ambos clientes consumen la misma API y la misma base de datos SQLite.

## Guía de estudio

Consulta la [guía completa en Markdown](./GUIA-DE-ESTUDIO.md) o descarga la [versión Word](./GUIA-DE-ESTUDIO.docx) para estudiar la arquitectura, los archivos, los flujos, la API, las pruebas y el estado real del despliegue.

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

## Despliegue gratuito en Azure

El prototipo se puede publicar en un único Azure App Service Linux con plan **F1 Free** en la región **Mexico Central**, la región cercana permitida por la suscripción Azure for Students. La misma aplicación sirve la web estática de Expo, la API y una base SQLite en `/home/data`, por lo que móvil y web usan los mismos datos. La dirección pública usa el dominio gratuito `azurewebsites.net`; no hace falta comprar un dominio.

El plan F1 no tiene costo de cómputo, pero está limitado a 60 minutos de CPU por día y 1 GB de almacenamiento compartido, no ofrece SLA y Microsoft lo recomienda para pruebas y aprendizaje, no para producción. Si se exceden las cuotas, el prototipo puede dejar de responder; este despliegue no crea recursos de pago adicionales ni añade alertas o servicios facturables. Consulta los [límites y condiciones actuales del plan gratuito](https://azure.microsoft.com/pricing/details/app-service/linux/).

Requisitos: Azure CLI, Node.js 20 o superior, dependencias instaladas en la raíz, y una suscripción Azure activa. Desde PowerShell en la raíz del repositorio:

```powershell
az login
.\deploy\azure-free.ps1
```

El script crea un identificador numérico y una contraseña de administrador nuevos para la demo, crea un grupo de recursos y un plan F1, compila la web para consumir la API del mismo dominio, despliega API y web, y comprueba `/health`, `/login` y la autenticación administrativa. La contraseña se usa solo para inicializar la cuenta y se elimina de los ajustes de Azure al terminar; la cuenta permanece en la base como hash. Las credenciales se muestran una sola vez al completar el script: guárdalas. No se guardan en el repositorio. El script no copia `backend/data` ni la base local al paquete de despliegue.

La capa gratuita está pensada para prototipos y desarrollo: una sola instancia, cuotas compartidas, sin SLA ni escalado. La base SQLite vive en el almacenamiento persistente de App Service; por el límite de instancia y almacenamiento, no es una arquitectura para alta concurrencia. No guardes información personal real en esta demostración. Para APK, compila por separado con EAS usando la URL pública generada y una cuenta Expo; el despliegue de Azure no crea ni firma un APK.
