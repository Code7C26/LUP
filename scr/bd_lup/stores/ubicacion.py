"""Ubicación de los comercios: distancias y conexión con Google Maps."""
import json
import logging
import math
from urllib.parse import quote, urlencode
from urllib.request import urlopen

from django.conf import settings

logger = logging.getLogger(__name__)

RADIO_TIERRA_KM = 6371.0

# Radios de búsqueda que puede elegir el cliente (km). 'todos' = sin límite.
RADIOS_KM = (2, 5, 10, 25)
RADIO_POR_DEFECTO = 10


def leer_radio(valor):
    """'5' -> 5 · 'todos' -> None · cualquier otra cosa -> radio por defecto."""
    if valor == 'todos':
        return None
    try:
        radio = int(valor)
    except (TypeError, ValueError):
        return RADIO_POR_DEFECTO
    return radio if radio in RADIOS_KM else RADIO_POR_DEFECTO


def ordenar_por_cercania(items, lat, lng, radio, tienda_de=lambda x: x, ordenar=True):
    """Calcula `distancia_km` de cada item y devuelve (cercanos ordenados, cantidad que quedó afuera).

    Con radio=None no se filtra: los que no tienen ubicación van al final.
    Con un radio, solo quedan los comercios con ubicación a esa distancia o menos.
    """
    items = list(items)
    for item in items:
        tienda = tienda_de(item)
        item.distancia_km = (
            distancia_km(lat, lng, tienda.latitud, tienda.longitud) if tienda.tiene_ubicacion else None
        )
    if radio is not None:
        dentro = [i for i in items if i.distancia_km is not None and i.distancia_km <= radio]
        afuera = len(items) - len(dentro)
        items = dentro
    else:
        afuera = 0
    if ordenar:
        items.sort(key=lambda i: (i.distancia_km is None, i.distancia_km or 0))
    return items, afuera


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


def _idioma_mapa():
    from django.utils import translation
    return 'en' if (translation.get_language() or '').startswith('en') else 'es'


def url_mapa_embebido(tienda):
    """URL para el <iframe> del mapa. Con clave usa la Maps Embed API oficial."""
    if settings.GOOGLE_MAPS_API_KEY:
        return 'https://www.google.com/maps/embed/v1/place?' + urlencode(
            {'key': settings.GOOGLE_MAPS_API_KEY, 'q': _destino(tienda), 'zoom': 16, 'language': _idioma_mapa()}
        )
    return f'https://maps.google.com/maps?q={quote(_destino(tienda))}&z=16&hl={_idioma_mapa()}&output=embed'


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
