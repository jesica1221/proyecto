const normalize = (text) => String(text)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const topics = [
  {
    keys: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'saludos', 'hey'],
    respuesta: '¡Hola! Soy el asistente de Efficient Parking. Puedo explicarte cómo reservar un cupo, cómo funciona el QR, qué es la Industria 5.0 y qué tecnologías hacen más eficiente un parqueadero. ¿Qué quieres saber?',
    tecnologias: [],
    siguientePregunta: '¿Quieres saber qué es la Industria 5.0?',
  },
  {
    keys: ['industria 5.0', 'industria 5', 'industry 5', 'quinta revolucion', 'que es la industria'],
    respuesta: 'La Industria 5.0 complementa la automatización de la Industria 4.0 poniendo a las personas en el centro. Busca que la tecnología trabaje junto a los humanos y se apoye en tres ideas: centrada en el ser humano, sostenible y resiliente. En un parqueadero significa reducir esperas y emisiones sin dejar de lado la atención de las personas.',
    tecnologias: [
      { nombre: 'Inteligencia artificial', beneficio: 'Recomienda cupos y anticipa horas de mayor demanda.' },
      { nombre: 'Internet de las cosas (IoT)', beneficio: 'Sensores que reportan la ocupación en tiempo real.' },
      { nombre: 'Analítica de datos', beneficio: 'Convierte el uso del parqueadero en decisiones de gestión.' },
    ],
    siguientePregunta: '¿Cómo aplica la IA en un parqueadero?',
  },
  {
    keys: ['inteligencia artificial', ' ia ', 'machine learning', 'aprendizaje automatico', 'prediccion'],
    respuesta: 'La inteligencia artificial analiza el historial de reservas para predecir las horas pico, sugerir la zona con más probabilidad de tener cupo y detectar patrones como cancelaciones o vencimientos frecuentes. Así la administración puede ajustar horarios y capacidad antes de que haya congestión.',
    tecnologias: [
      { nombre: 'Modelos predictivos', beneficio: 'Estiman la ocupación por hora y por zona.' },
      { nombre: 'Detección de anomalías', beneficio: 'Señala usos inusuales de espacios o reservas.' },
    ],
    siguientePregunta: '¿Qué sensores se usan para medir la ocupación?',
  },
  {
    keys: ['iot', 'internet de las cosas', 'sensor', 'sensores', 'ocupacion'],
    respuesta: 'El IoT instala sensores (ultrasónicos, magnéticos o cámaras) en cada espacio para saber si está libre u ocupado. Esa información llega al servidor en tiempo real, de modo que el estudiante ve cupos reales y no tiene que dar vueltas buscando dónde parquear.',
    tecnologias: [
      { nombre: 'Sensores de ocupación', beneficio: 'Detectan si un espacio está libre en tiempo real.' },
      { nombre: 'Redes de bajo consumo (LoRaWAN)', beneficio: 'Conectan muchos sensores con poco gasto de energía.' },
    ],
    siguientePregunta: '¿Qué es un gemelo digital?',
  },
  {
    keys: ['gemelo digital', 'digital twin', 'simulacion'],
    respuesta: 'Un gemelo digital es una copia virtual del parqueadero que se actualiza con datos reales. Permite simular qué pasaría si se cierra una zona o aumenta la demanda, y probar decisiones sin afectar a los usuarios.',
    tecnologias: [
      { nombre: 'Gemelo digital', beneficio: 'Simula escenarios de demanda antes de aplicarlos.' },
      { nombre: 'Visualización 3D', beneficio: 'Muestra el estado del parqueadero de forma intuitiva.' },
    ],
    siguientePregunta: '¿Cómo ayuda la computación perimetral?',
  },
  {
    keys: ['edge', 'perimetral', 'computacion en el borde', 'nube', 'cloud'],
    respuesta: 'La computación perimetral procesa los datos cerca de donde se generan, por ejemplo en la cámara o el sensor, y solo envía a la nube lo importante. Reduce la latencia y el consumo de red. La nube, por su parte, guarda el historial y sirve a la web y a la app móvil.',
    tecnologias: [
      { nombre: 'Edge computing', beneficio: 'Respuestas más rápidas y menos tráfico de red.' },
      { nombre: 'Nube (Azure)', beneficio: 'Acceso desde web y móvil a los mismos datos.' },
    ],
    siguientePregunta: '¿Cómo se relaciona esto con la sostenibilidad?',
  },
  {
    keys: ['sostenib', 'ambiente', 'emision', 'contaminacion', 'verde', 'energia', 'solar'],
    respuesta: 'Un parqueadero inteligente reduce emisiones porque los conductores dejan de buscar cupo dando vueltas. Además se puede alimentar la iluminación con energía solar, apagar luces en zonas vacías y dar prioridad a motos, bicicletas o carga de vehículos eléctricos.',
    tecnologias: [
      { nombre: 'Iluminación LED con sensores', beneficio: 'Se enciende solo donde hay presencia.' },
      { nombre: 'Paneles solares', beneficio: 'Reducen el consumo de energía de la red.' },
      { nombre: 'Puntos de carga eléctrica', beneficio: 'Fomentan vehículos de bajas emisiones.' },
    ],
    siguientePregunta: '¿Cómo se cuida la seguridad de los datos?',
  },
  {
    keys: ['seguridad de los datos', 'privacidad', 'contrasena', 'datos personales', 'proteccion', 'cifrad', 'token'],
    respuesta: 'En esta aplicación las contraseñas se guardan cifradas (hash con bcrypt) y las sesiones usan tokens firmados que caducan a las 12 horas. Cada rol (estudiante, seguridad, administración) solo accede a lo que le corresponde. En un sistema real se recomienda usar siempre HTTPS y recopilar solo los datos necesarios.',
    tecnologias: [
      { nombre: 'Cifrado y hash de contraseñas', beneficio: 'Protegen las cuentas aunque se filtre la base de datos.' },
      { nombre: 'Control de acceso por roles', beneficio: 'Cada usuario ve solo lo que necesita.' },
    ],
    siguientePregunta: '¿Cómo reservo un cupo?',
  },
  {
    keys: ['reservar', 'reserva', 'cupo', 'espacio', 'apartar'],
    respuesta: 'Para reservar entra como estudiante, elige una zona con cupos disponibles para tu tipo de vehículo y selecciona un espacio. La reserva dura 15 minutos: durante ese tiempo se muestra un QR que seguridad valida. Si no llegas, la reserva vence y el espacio se libera automáticamente. También puedes cancelarla cuando quieras.',
    tecnologias: [
      { nombre: 'Reserva en línea', beneficio: 'Aparta el cupo antes de llegar a la universidad.' },
      { nombre: 'Código QR', beneficio: 'Permite que seguridad compruebe tu reserva activa.' },
    ],
    siguientePregunta: '¿Cómo funciona el código QR?',
  },
  {
    keys: ['qr', 'codigo qr', 'escanear', 'validar'],
    respuesta: 'El QR identifica tu reserva activa. El personal de seguridad lo escanea y el servidor comprueba que corresponda a una reserva vigente antes de permitir el ingreso. Si la reserva venció o fue cancelada, el código deja de ser válido. Ten en cuenta que el QR no es una firma criptográfica: la validación real la hace el servidor.',
    tecnologias: [
      { nombre: 'Código QR', beneficio: 'Acceso rápido sin tarjetas físicas.' },
      { nombre: 'Validación en el servidor', beneficio: 'Evita usar reservas vencidas o canceladas.' },
    ],
    siguientePregunta: '¿Qué pasa si mi reserva vence?',
  },
  {
    keys: ['cancelar', 'vence', 'vencer', 'expira', '15 minutos', 'tiempo'],
    respuesta: 'Cada reserva de estudiante dura 15 minutos. Si no llegas a tiempo, vence y el espacio vuelve a quedar disponible para otras personas. Puedes cancelarla manualmente desde tu pantalla de reserva y hacer una nueva cuando lo necesites; solo se permite una reserva activa por usuario.',
    tecnologias: [],
    siguientePregunta: '¿Quién valida mi ingreso?',
  },
  {
    keys: ['dashboard', 'analisis', 'estadistica', 'grafica', 'indicador', 'metrica', 'hora pico'],
    respuesta: 'El panel de administración muestra la ocupación por zona, la actividad por hora, la mezcla de vehículos, la tendencia de los últimos 14 días, las tasas de cancelación y vencimiento, la duración promedio de las reservas y las horas pico. Con eso se toman decisiones sobre capacidad y horarios.',
    tecnologias: [
      { nombre: 'Analítica de datos', beneficio: 'Convierte las reservas en indicadores de gestión.' },
      { nombre: 'Dashboards en tiempo real', beneficio: 'Permiten ver la ocupación al instante.' },
    ],
    siguientePregunta: '¿Qué tecnologías de Industria 5.0 aplican aquí?',
  },
  {
    keys: ['seguridad', 'vigilante', 'guarda', 'visitante', 'ingreso'],
    respuesta: 'El personal de seguridad puede escanear códigos QR, buscar usuarios por cédula o placa, y asignar espacios a visitantes o usuarios. Todo queda registrado como eventos para poder auditar quién entró y cuándo.',
    tecnologias: [
      { nombre: 'Registro de eventos', beneficio: 'Trazabilidad de ingresos y asignaciones.' },
    ],
    siguientePregunta: '¿Cómo funciona el código QR?',
  },
  {
    keys: ['gracias', 'chao', 'adios', 'hasta luego'],
    respuesta: '¡Con gusto! Si tienes otra duda sobre reservas, el QR o la Industria 5.0, aquí estaré.',
    tecnologias: [],
    siguientePregunta: '',
  },
];

const fallback = {
  respuesta: 'Puedo ayudarte con temas del parqueadero y la Industria 5.0. Por ejemplo: cómo reservar un cupo, cómo funciona el QR, qué pasa si la reserva vence, qué sensores miden la ocupación o cómo ayuda la inteligencia artificial. Intenta preguntarme algo de esos temas.',
  tecnologias: [
    { nombre: 'Reservas en línea', beneficio: 'Apartan un cupo por 15 minutos.' },
    { nombre: 'Internet de las cosas', beneficio: 'Mide la ocupación en tiempo real.' },
  ],
  siguientePregunta: '¿Qué es la Industria 5.0?',
};

function answerLocally(question) {
  const text = ` ${normalize(question)} `;
  let best = null;
  let bestScore = 0;
  for (const topic of topics) {
    const score = topic.keys.reduce((total, key) => (
      text.includes(normalize(key)) ? total + key.length : total
    ), 0);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }
  const { respuesta, tecnologias, siguientePregunta } = best || fallback;
  return { respuesta, tecnologias, siguientePregunta };
}

module.exports = { answerLocally };
