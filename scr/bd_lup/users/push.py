"""Notificaciones push al celular, con el servicio gratuito de Expo.

Llegan aunque la app esté cerrada ("Te hicieron una reserva", "Aceptaron tu donación").
La app registra cada celular en DispositivoPush (POST /api/auth/push/) y desde acá se le
manda el aviso a todos los celulares de esa cuenta:

    push.enviar(usuario, 'Te hicieron una reserva 🛍️', 'Ana reservó 2 × Medialunas.', {'pantalla': 'ConfirmarRetiro'})

"datos" viaja con el aviso: al tocarlo, la app abre esa pantalla (ver app/src/servicios/push.js).
Lo llama notificaciones.py, junto con los emails. Se puede apagar con PUSH_ACTIVADO=0.
"""
import json
import logging
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

URL_EXPO = 'https://exp.host/--/api/v2/push/send'


def _mandar_a_expo(mensajes):
    """Hace el pedido HTTP a Expo. Devuelve un resultado por mensaje: [{'status': 'ok'}, ...]."""
    pedido = urllib.request.Request(
        URL_EXPO,
        data=json.dumps(mensajes).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(pedido, timeout=10) as respuesta:
        return json.loads(respuesta.read().decode('utf-8')).get('data', [])


def tokens_de(usuario):
    if usuario is None or not usuario.is_active:
        return []
    return list(usuario.dispositivos_push.values_list('token', flat=True))


def enviar_a_tokens(tokens, titulo, cuerpo, datos=None):
    """Manda el aviso a esos celulares. Si Expo dice que la app ya no está instalada, se borra el token."""
    if not tokens or not settings.PUSH_ACTIVADO:
        return
    from .models import DispositivoPush
    mensajes = [
        {'to': token, 'title': titulo, 'body': cuerpo, 'data': datos or {}, 'sound': 'default',
         'channelId': 'avisos', 'priority': 'high'}
        for token in tokens
    ]
    try:
        # Expo acepta hasta 100 mensajes por pedido
        resultados = []
        for i in range(0, len(mensajes), 100):
            resultados += _mandar_a_expo(mensajes[i:i + 100])
    except Exception:  # sin internet, Expo caído...
        logger.exception('No se pudo enviar el aviso push "%s"', titulo)
        return
    vencidos = [
        token for token, r in zip(tokens, resultados)
        if r.get('status') == 'error' and (r.get('details') or {}).get('error') == 'DeviceNotRegistered'
    ]
    if vencidos:
        DispositivoPush.objects.filter(token__in=vencidos).delete()


def enviar(usuario, titulo, cuerpo, datos=None):
    enviar_a_tokens(tokens_de(usuario), titulo, cuerpo, datos)
