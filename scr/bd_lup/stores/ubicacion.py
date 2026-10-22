"""Ubicación de los comercios: distancias y conexión con Google Maps."""
import json
import logging
import math
from urllib.parse import quote, urlencode
from urllib.request import urlopen

from django.conf import settings

logger = logging.getLogger(__name__)

RADIO_TIERRA_KM = 6371.0


def distancia_km(lat1, lng1, lat2, lng2):
    """Distancia en línea recta entre dos puntos (fórmula de haversine)."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * RADIO_TIERRA_KM * math.asin(math.sqrt(a))


def leer_coordenadas(lat, lng):
    """Convierte los parámetros ?lat=&lng= en números válidos, o (None, None)."""
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        return None, None
    if -90 <= lat <= 90 and -180 <= lng <= 180:
        return lat, lng
    return None, None


def _destino(tienda):
    if tienda.tiene_ubicacion:
        return f'{tienda.latitud},{tienda.longitud}'
    return tienda.direccion


def url_como_llegar(tienda):
    """Link que abre Google Maps (o la app en el celular) con el recorrido hasta el comercio."""
    return 'https://www.google.com/maps/dir/?' + urlencode({'api': 1, 'destination': _destino(tienda)})


def url_mapa_embebido(tienda):
    """URL para el <iframe> del mapa. Con clave usa la Maps Embed API oficial."""
    if settings.GOOGLE_MAPS_API_KEY:
        return 'https://www.google.com/maps/embed/v1/place?' + urlencode(
            {'key': settings.GOOGLE_MAPS_API_KEY, 'q': _destino(tienda), 'zoom': 16, 'language': 'es'}
        )
    return f'https://maps.google.com/maps?q={quote(_destino(tienda))}&z=16&hl=es&output=embed'


def geocodificar(direccion):
    """Busca latitud y longitud de una dirección con la Geocoding API de Google.

    Devuelve (lat, lng) o (None, None) si no hay clave o no se encontró.
    """
    if not settings.GOOGLE_MAPS_API_KEY or not direccion:
        return None, None
    url = 'https://maps.googleapis.com/maps/api/geocode/json?' + urlencode(
        {'address': f'{direccion}, Argentina', 'key': settings.GOOGLE_MAPS_API_KEY, 'region': 'ar', 'language': 'es'}
    )
    try:
        with urlopen(url, timeout=6) as respuesta:
            datos = json.load(respuesta)
        if datos.get('status') == 'OK':
            punto = datos['results'][0]['geometry']['location']
            return punto['lat'], punto['lng']
        logger.warning('Geocoding sin resultado para "%s": %s', direccion, datos.get('status'))
    except Exception:
        logger.exception('Falló la Geocoding API para "%s"', direccion)
    return None, None
