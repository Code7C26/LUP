// Recordatorio de retiro: un aviso en el celular 30 minutos antes de que empiece
// el horario de retiro del comercio, el día límite de la oferta.
// Son notificaciones LOCALES (las programa el mismo celular): no hace falta Django ni internet.
// Uso:
//   await programarRecordatorio({ reservaId, producto: 'Medialunas', comercio: 'Panadería Sol',
//                                  codigo: 'A7K2Q9', horario: '18 a 20 hs', fecha: '2026-11-03' });
//   await cancelarRecordatorio(reservaId);   ← al cancelar la reserva
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

const CLAVE = 'lup_recordatorios'; // { idReserva: idNotificacion }
const MINUTOS_ANTES = 30;

// Que se muestre aunque la app esté abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function leer() {
  try {
    return JSON.parse((await SecureStore.getItemAsync(CLAVE)) || '{}') || {};
  } catch {
    return {};
  }
}

async function guardar(mapa) {
  try {
    await SecureStore.setItemAsync(CLAVE, JSON.stringify(mapa));
  } catch {
    // nada
  }
}

// "18 a 20 hs" → { horas: 18, minutos: 0 }   "8:30 a 12" → { horas: 8, minutos: 30 }
export function horaDeInicio(horario) {
  const partes = String(horario || '').match(/(\d{1,2})(?:[:.](\d{2}))?/);
  if (!partes) return null;
  const horas = Number(partes[1]);
  const minutos = Number(partes[2] || 0);
  if (horas > 23 || minutos > 59) return null;
  return { horas, minutos };
}

// Devuelve la hora del aviso (Date) o null si no se puede o ya pasó
export function horaDelAviso(fecha, horario) {
  const inicio = horaDeInicio(horario);
  if (!fecha || !inicio) return null;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const cuando = new Date(anio, mes - 1, dia, inicio.horas, inicio.minutos - MINUTOS_ANTES);
  return cuando.getTime() > Date.now() + 60 * 1000 ? cuando : null;
}

export async function programarRecordatorio({ reservaId, producto, comercio, codigo, horario, fecha }) {
  try {
    const cuando = horaDelAviso(fecha, horario);
    if (!cuando) return null;

    const permiso = await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return null;

    const idNotificacion = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Retirá tu pedido en ${comercio} 🛍️`,
        body: `${producto} · Retiro: ${horario}. Tu código es ${codigo}.`,
        data: { pantalla: 'MisReservas' }, // al tocarlo se abre "Mis reservas" (servicios/push.js)
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando },
    });
    const mapa = await leer();
    mapa[reservaId] = idNotificacion;
    await guardar(mapa);
    return cuando;
  } catch {
    return null; // si algo falla, la reserva sigue igual
  }
}

export async function cancelarRecordatorio(reservaId) {
  try {
    const mapa = await leer();
    if (mapa[reservaId]) {
      await Notifications.cancelScheduledNotificationAsync(mapa[reservaId]);
      delete mapa[reservaId];
      await guardar(mapa);
    }
  } catch {
    // nada
  }
}

// Al cerrar sesión: se cancelan todos los avisos de retiro (las reservas eran de esa cuenta)
export async function cancelarTodosLosRecordatorios() {
  try {
    const mapa = await leer();
    await Promise.all(Object.values(mapa).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
    await SecureStore.deleteItemAsync(CLAVE);
  } catch {
    // nada
  }
}

// "a las 17:30" para mostrar en pantalla
export function textoHora(fechaHora) {
  return `${String(fechaHora.getHours()).padStart(2, '0')}:${String(fechaHora.getMinutes()).padStart(2, '0')}`;
}
