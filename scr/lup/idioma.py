"""Idioma de la página web.

- La web usa el idioma que la persona eligió con el botón ES/EN (cookie "django_language").
  Si nunca eligió, se muestra en español (no se adivina por el navegador).
- La API (/api/...) responde SIEMPRE en español, para que la app móvil no cambie.
"""
from django.conf import settings
from django.utils import translation


class IdiomaMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.disponibles = {codigo for codigo, _ in settings.LANGUAGES}

    def __call__(self, request):
        idioma = settings.LANGUAGE_CODE
        if not request.path.startswith('/api/'):
            elegido = request.COOKIES.get(settings.LANGUAGE_COOKIE_NAME)
            if elegido in self.disponibles:
                idioma = elegido
        translation.activate(idioma)
        request.LANGUAGE_CODE = translation.get_language()
        response = self.get_response(request)
        response.headers.setdefault('Content-Language', request.LANGUAGE_CODE)
        return response
