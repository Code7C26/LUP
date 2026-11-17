"""Idioma de la página web y de la API.

- La web usa el idioma que la persona eligió con el botón ES/EN (cookie "django_language").
  Si nunca eligió, se muestra en español (no se adivina por el navegador).
- La API (/api/...) usa el encabezado Accept-Language que manda la app (el idioma elegido en Perfil):
  si empieza con "en", contesta en inglés; si no (o si no viene), en español. La cookie de la web no cuenta.
"""
from django.conf import settings
from django.utils import translation
from django.utils.cache import patch_vary_headers


class IdiomaMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.disponibles = {codigo for codigo, _ in settings.LANGUAGES}

    def __call__(self, request):
        idioma = settings.LANGUAGE_CODE
        es_api = request.path.startswith('/api/')
        if es_api:
            if request.headers.get('Accept-Language', '').strip().lower().startswith('en'):
                idioma = 'en'
        else:
            elegido = request.COOKIES.get(settings.LANGUAGE_COOKIE_NAME)
            if elegido in self.disponibles:
                idioma = elegido
        translation.activate(idioma)
        request.LANGUAGE_CODE = translation.get_language()
        response = self.get_response(request)
        response.headers.setdefault('Content-Language', request.LANGUAGE_CODE)
        if es_api:
            patch_vary_headers(response, ['Accept-Language'])  # la misma URL cambia según el idioma
        return response
