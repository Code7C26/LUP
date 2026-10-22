from django.conf import settings


def google_maps(request):
    """Deja la clave de Google Maps disponible en las plantillas (puede estar vacía)."""
    return {'GOOGLE_MAPS_API_KEY': settings.GOOGLE_MAPS_API_KEY}
