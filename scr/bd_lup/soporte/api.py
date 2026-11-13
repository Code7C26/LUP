"""API del chat de ayuda para la app (Expo): la misma lógica y los mismos límites que la web (views.py).

  POST /api/soporte/mensaje/  {texto, conversacion?, pagina?, invitado?}
       → {conversacion, respuesta, con_ia[, invitado]}
  POST /api/soporte/persona/  {email?, detalle?, conversacion?, pagina?, invitado?}
       → {ok, conversacion, respuesta[, invitado]}

Con sesión: header "Authorization: Token <token>" (solo token; la cookie de sesión de la web no cuenta acá).
Sin sesión (invitado): la primera respuesta trae "invitado", una clave que la app guarda y vuelve a mandar.
Hace de "cookie de sesión": con ella se sigue la misma charla y se cuentan los 30 mensajes por hora.
"""
import secrets

from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import views

PREFIJO_INVITADO = 'app-'  # así nunca se confunde con la clave de sesión de un navegador


def _datos(request):
    return request.data if isinstance(request.data, dict) else {}


def _clave_invitado(datos):
    """La clave que mandó la app, si es una de las nuestras; si no, una nueva."""
    clave = str(datos.get('invitado') or '')
    if clave.startswith(PREFIJO_INVITADO) and 20 <= len(clave) <= 40:
        return clave
    return PREFIJO_INVITADO + secrets.token_urlsafe(24)  # 36 caracteres (Conversacion.sesion admite 40)


def _pagina(datos):
    # "app:" adelante: el equipo (en el admin y en el email) y el asistente saben que escribe desde la app
    return 'app:' + str(datos.get('pagina', '')).strip()


def _atender(request, funcion):
    datos = _datos(request)
    usuario = request.user if request.user.is_authenticated else None
    sesion = '' if usuario else _clave_invitado(datos)
    cuerpo, estado = funcion(usuario, sesion, datos, _pagina(datos))
    if usuario is None:
        cuerpo['invitado'] = sesion
    return Response(cuerpo, status=estado)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def mensaje(request):
    return _atender(request, views.responder_mensaje)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def persona(request):
    return _atender(request, views.derivar_a_persona)
