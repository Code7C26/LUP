"""/salud/: respuesta mínima para que el hosting (Render) sepa que la página está funcionando.

Va primero en MIDDLEWARE: contesta antes del redireccionamiento a https y del control de
dominios (el chequeo de Render entra por adentro, sin https y con otra dirección).
"""
from django.db import connection
from django.http import HttpResponse


class SaludMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path != '/salud/':
            return self.get_response(request)
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
        except Exception:
            return HttpResponse('sin base de datos', status=503, content_type='text/plain')
        return HttpResponse('ok', content_type='text/plain')
