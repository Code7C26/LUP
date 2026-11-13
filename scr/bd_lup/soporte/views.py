"""Chat de ayuda: el widget de la página manda los mensajes acá (JSON) y recibe la respuesta."""
import json
import logging
import threading
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMessage
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.utils import timezone
from django.utils.translation import gettext as _
from django.views.decorators.http import require_POST

from . import asistente
from .models import Conversacion, Mensaje

logger = logging.getLogger(__name__)

MAX_CARACTERES = 800
MAX_MENSAJES_POR_HORA = 30
WHATSAPP = '+54 9 3547 62-0629'
WHATSAPP_LINK = 'https://wa.me/5493547620629'


def _datos(request):
    try:
        datos = json.loads(request.body or b'{}')
    except (ValueError, UnicodeDecodeError):
        return {}
    return datos if isinstance(datos, dict) else {}


def _clave_sesion(request):
    if not request.session.session_key:
        request.session.save()
    return request.session.session_key


def _usuario(request):
    return request.user if request.user.is_authenticated else None


# ==========================================
# Lógica del chat (la usan la web, con la sesión, y la API de la app, con el token: soporte/api.py)
#   usuario: la cuenta que escribe, o None si es un visitante
#   sesion: para visitantes, la clave que identifica su charla (cookie de sesión en la web,
#           clave "app-..." en la app). Devuelven (datos de la respuesta, código HTTP).
# ==========================================

def _conversacion_propia(usuario, sesion, pk):
    """La conversación solo la puede seguir quien la empezó (su cuenta o su sesión)."""
    try:
        pk = int(pk)
    except (TypeError, ValueError):
        return None
    qs = Conversacion.objects.filter(pk=pk)
    if usuario is not None:
        qs = qs.filter(usuario=usuario)
    else:
        qs = qs.filter(usuario__isnull=True, sesion=sesion)
    return qs.first()


def _demasiados_mensajes(usuario, sesion):
    desde = timezone.now() - timedelta(hours=1)
    qs = Mensaje.objects.filter(rol=Mensaje.USUARIO, creado_en__gte=desde)
    if usuario is not None:
        qs = qs.filter(conversacion__usuario=usuario)
    else:
        qs = qs.filter(conversacion__usuario__isnull=True, conversacion__sesion=sesion)
    return qs.count() >= MAX_MENSAJES_POR_HORA


def _error_limite():
    return {'error': _('Mandaste muchos mensajes seguidos. Esperá un rato o escribinos por WhatsApp.')}, 429


def responder_mensaje(usuario, sesion, datos, pagina):
    texto = str(datos.get('texto', '')).strip()
    if not texto:
        return {'error': _('Escribí tu consulta.')}, 400
    texto = texto[:MAX_CARACTERES]

    if _demasiados_mensajes(usuario, sesion):
        return _error_limite()

    conversacion = _conversacion_propia(usuario, sesion, datos.get('conversacion'))
    if conversacion is None:
        conversacion = Conversacion.objects.create(usuario=usuario, sesion=sesion, pagina=pagina[:200])
    Mensaje.objects.create(conversacion=conversacion, rol=Mensaje.USUARIO, texto=texto)

    historial = [
        {'role': 'user' if m.rol == Mensaje.USUARIO else 'assistant', 'content': m.texto}
        for m in conversacion.mensajes.all()
    ]
    respuesta = asistente.preguntar_a_claude(historial, usuario, conversacion.pagina)
    con_ia = respuesta is not None
    if not con_ia:
        respuesta = asistente.respuesta_frecuente(texto)
    Mensaje.objects.create(conversacion=conversacion, rol=Mensaje.ASISTENTE, texto=respuesta, con_ia=con_ia)
    conversacion.save(update_fields=['actualizada_en'])

    return {'conversacion': conversacion.pk, 'respuesta': respuesta, 'con_ia': con_ia}, 200


def derivar_a_persona(usuario, sesion, datos, pagina):
    """'Hablar con una persona': avisa al equipo por email con toda la charla."""
    detalle = str(datos.get('detalle', '')).strip()[:MAX_CARACTERES]
    email = str(datos.get('email', '')).strip()
    if usuario is not None and not email:
        email = usuario.email
    if not email:
        return {'error': _('Dejanos un email para poder responderte.')}, 400
    try:
        validate_email(email)
    except ValidationError:
        return {'error': _('Ese email no parece válido.')}, 400

    conversacion = _conversacion_propia(usuario, sesion, datos.get('conversacion'))
    if conversacion is None:
        if _demasiados_mensajes(usuario, sesion):
            return _error_limite()
        conversacion = Conversacion.objects.create(usuario=usuario, sesion=sesion, pagina=pagina[:200])
    elif conversacion.derivada and not detalle:
        return {'ok': True, 'conversacion': conversacion.pk, 'respuesta': _respuesta_derivada(email)}, 200

    if detalle:
        Mensaje.objects.create(conversacion=conversacion, rol=Mensaje.USUARIO, texto=detalle)
    conversacion.derivada = True
    conversacion.resuelta = False
    conversacion.email_contacto = email
    conversacion.save()

    if settings.EMAIL_EN_SEGUNDO_PLANO:
        threading.Thread(target=_mandar_al_equipo, args=(conversacion, detalle), daemon=True).start()
    else:
        _mandar_al_equipo(conversacion, detalle)

    respuesta = _respuesta_derivada(email)
    Mensaje.objects.create(conversacion=conversacion, rol=Mensaje.ASISTENTE, texto=respuesta)
    return {'ok': True, 'conversacion': conversacion.pk, 'respuesta': respuesta}, 200


# ==========================================
# Vistas de la web (widget de base.html, con la sesión del navegador)
# ==========================================

@require_POST
def mensaje(request):
    datos = _datos(request)
    cuerpo, estado = responder_mensaje(_usuario(request), _clave_sesion(request), datos, str(datos.get('pagina', '')))
    return JsonResponse(cuerpo, status=estado)


@require_POST
def derivar(request):
    datos = _datos(request)
    cuerpo, estado = derivar_a_persona(_usuario(request), _clave_sesion(request), datos, str(datos.get('pagina', '')))
    return JsonResponse(cuerpo, status=estado)


def _mandar_al_equipo(conversacion, detalle):
    if not settings.SOPORTE_EMAIL:
        logger.warning('Pedido de soporte #%s sin SOPORTE_EMAIL configurado', conversacion.pk)
        return
    u = conversacion.usuario
    lineas = [
        f'Pedido de ayuda #{conversacion.pk} desde el chat de Lüp.',
        f'Usuario: {u.username} ({u.get_rol_display()})' if u else 'Usuario: visitante sin cuenta',
        f'Email para responder: {conversacion.email_contacto or "-"}',
        f'Página: {conversacion.pagina or "-"}',
        '',
    ]
    if detalle:
        lineas += ['Lo que necesita:', detalle, '']
    lineas.append('Conversación:')
    for m in conversacion.mensajes.all():
        quien = 'Usuario' if m.rol == Mensaje.USUARIO else 'Asistente'
        lineas.append(f'[{m.creado_en:%d/%m %H:%M}] {quien}: {m.texto}')
    lineas += ['', f'Ver en el admin: {settings.SITIO_URL}/admin/soporte/conversacion/{conversacion.pk}/change/']

    email = EmailMessage(
        subject=f'[Lüp soporte] Pedido #{conversacion.pk}',
        body='\n'.join(lineas),
        to=[settings.SOPORTE_EMAIL],
        reply_to=[conversacion.email_contacto] if conversacion.email_contacto else None,
    )
    try:
        email.send()
    except Exception:
        logger.exception('No se pudo mandar el pedido de soporte #%s', conversacion.pk)


def _respuesta_derivada(email):
    return _('Listo, le pasamos tu consulta al equipo de Lüp. Te vamos a responder a %(email)s lo antes posible. '
             'Si es urgente, escribinos por WhatsApp al %(tel)s.') % {'email': email, 'tel': WHATSAPP}
