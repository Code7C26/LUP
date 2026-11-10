"""Avisos por email (Gmail) para todos los usuarios de Lüp.

Quién recibe qué:

  CONSUMIDORES
    · bienvenida ............... al crear la cuenta
    · reserva_confirmada ....... al reservar (con el código de retiro)
    · reserva_cancelada_cliente  al cancelar su reserva
    · recordatorio_retiro ...... el día que vence el retiro (comando enviar_recordatorios)
    · pedir_opinion ............ cuando el comercio confirma el retiro
    · respuesta_opinion ........ cuando el comercio responde su opinión

  COMERCIOS
    · bienvenida
    · nueva_reserva / reserva_cancelada
    · sin_stock ................ cuando las reservas agotan un producto
    · solicitud_donacion ....... cuando una organización pide una donación
    · nueva_opinion ............ cuando un cliente opina

  ORGANIZACIONES
    · bienvenida
    · donacion_aprobada / donacion_rechazada
    · nueva_donacion ........... cuando un comercio publica algo donable

Cada persona puede apagar los avisos en "Mis datos" o con el link "Dejar de recibir
avisos" que va al pie de cada email (Usuario.avisos_email). La bienvenida se manda igual.

Los emails se envían cuando todo quedó guardado (transaction.on_commit) y en segundo
plano: si Gmail falla, la reserva/acción se hace igual y el error queda en el log.
Se disparan desde signals.py (así funcionan igual desde la web y desde la app).
"""
import contextlib
import logging
import threading
from contextvars import ContextVar

from django.conf import settings
from django.core import signing
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils import translation

logger = logging.getLogger(__name__)

SAL_BAJA = 'lup-baja-avisos'
_silencio = ContextVar('lup_avisos_silenciados', default=False)


@contextlib.contextmanager
def silenciadas():
    """Dentro de este bloque no se manda ningún email (lo usa cargar_demo)."""
    marca = _silencio.set(True)
    try:
        yield
    finally:
        _silencio.reset(marca)


# ==========================================
# Infraestructura
# ==========================================

def token_baja(usuario):
    """Token firmado para el link "Dejar de recibir avisos" (no vence, solo sirve para ese usuario)."""
    return signing.dumps(usuario.pk, salt=SAL_BAJA)


def usuario_de_token(token):
    from scr.bd_lup.users.models import Usuario
    try:
        pk = signing.loads(token, salt=SAL_BAJA)
    except signing.BadSignature:
        return None
    return Usuario.objects.filter(pk=pk).first()


def _url(nombre, *args):
    return settings.SITIO_URL + reverse(nombre, args=args)


def _quiere_avisos(usuario, obligatorio=False):
    """True si a esa persona le podemos mandar el email."""
    if usuario is None or not usuario.email or not usuario.is_active:
        return False
    return obligatorio or usuario.avisos_email


def _enviar(asunto, plantilla, contexto, usuario):
    # Los emails se mandan siempre en español
    with translation.override(settings.LANGUAGE_CODE):
        _enviar_en_idioma(asunto, plantilla, contexto, usuario)


def _enviar_en_idioma(asunto, plantilla, contexto, usuario):
    url_baja = _url('baja_avisos', token_baja(usuario))
    contexto = {
        **contexto,
        'usuario': usuario,
        'sitio_url': settings.SITIO_URL,
        'url_panel': _url('panel'),
        'url_avisos': _url('perfil') + '#avisos',
        'url_baja': url_baja,
    }
    texto = render_to_string(f'emails/{plantilla}.txt', contexto)
    html = render_to_string(f'emails/{plantilla}.html', contexto)
    mensaje = EmailMultiAlternatives(
        asunto, texto, settings.DEFAULT_FROM_EMAIL, [usuario.email],
        headers={'List-Unsubscribe': f'<{url_baja}>'},
    )
    mensaje.attach_alternative(html, 'text/html')
    try:
        mensaje.send()
    except Exception:  # Gmail caído, clave mal puesta, sin internet...
        logger.exception('No se pudo enviar el aviso "%s" a %s', asunto, usuario.email)


def _programar(asunto, plantilla, contexto, usuario, obligatorio=False):
    """Envía el email cuando termina de guardarse todo (y en segundo plano si está activado)."""
    if _silencio.get() or not _quiere_avisos(usuario, obligatorio):
        return

    def tarea():
        if settings.EMAIL_EN_SEGUNDO_PLANO:
            threading.Thread(target=_enviar, args=(asunto, plantilla, contexto, usuario), daemon=True).start()
        else:
            _enviar(asunto, plantilla, contexto, usuario)

    transaction.on_commit(tarea)


def _nombre(usuario):
    return usuario.first_name or usuario.nombre_visible


# ==========================================
# Todos
# ==========================================

def bienvenida(usuario):
    _programar('¡Bienvenido/a a Lüp! 🌱', 'bienvenida', {'nombre': _nombre(usuario)}, usuario, obligatorio=True)


# ==========================================
# Reservas
# ==========================================

def _contexto_reserva(reserva):
    from scr.bd_lup.stores.ubicacion import url_como_llegar
    tienda = reserva.producto.comercio
    return {
        'reserva': reserva, 'tienda': tienda, 'producto': reserva.producto, 'cliente': reserva.consumidor,
        'url_como_llegar': url_como_llegar(tienda),
    }


def avisar_nueva_reserva(reserva):
    """Al comercio (nueva reserva) y al cliente (confirmación con el código)."""
    contexto = _contexto_reserva(reserva)
    _programar(
        f'Nueva reserva: {reserva.cantidad} × {reserva.producto.titulo}',
        'nueva_reserva', contexto, reserva.producto.comercio.usuario,
    )
    _programar(
        f'Tu reserva en {reserva.producto.comercio}: código {reserva.codigo_retiro}',
        'reserva_confirmada', contexto, reserva.consumidor,
    )


def avisar_reserva_cancelada(reserva):
    contexto = _contexto_reserva(reserva)
    _programar(
        f'Reserva cancelada: {reserva.cantidad} × {reserva.producto.titulo}',
        'reserva_cancelada', contexto, reserva.producto.comercio.usuario,
    )
    _programar(
        f'Cancelaste tu reserva de {reserva.producto.titulo}',
        'reserva_cancelada_cliente', contexto, reserva.consumidor,
    )


def recordar_retiro(reserva):
    """El día que vence: "Hoy es el último día para retirar"."""
    _programar(
        f'Hoy es el último día para retirar {reserva.producto.titulo}',
        'recordatorio_retiro', _contexto_reserva(reserva), reserva.consumidor,
    )


def pedir_opinion(reserva):
    """Cuando el comercio confirma el retiro: "¿Cómo te fue?"."""
    _programar(
        f'¿Cómo te fue con {reserva.producto.titulo}?',
        'pedir_opinion',
        {**_contexto_reserva(reserva), 'url_opinar': _url('calificar_reserva', reserva.pk)},
        reserva.consumidor,
    )


def avisar_sin_stock(producto):
    """Al comercio: las reservas agotaron el producto."""
    _programar(
        f'¡Se agotó {producto.titulo}!',
        'sin_stock',
        {'producto': producto, 'tienda': producto.comercio, 'url_editar': _url('editar_excedente', producto.pk)},
        producto.comercio.usuario,
    )


# ==========================================
# Opiniones
# ==========================================

def avisar_nueva_opinion(calificacion):
    """Al comercio, cuando un cliente opina."""
    _programar(
        f'Nueva opinión: {calificacion.puntaje}★ de {_nombre(calificacion.consumidor)}',
        'nueva_opinion',
        {'calificacion': calificacion, 'tienda': calificacion.tienda, 'producto': calificacion.reserva.producto,
         'cliente': calificacion.consumidor,
         'estrellas': range(calificacion.puntaje), 'vacias': range(5 - calificacion.puntaje),
         'url_responder': _url('panel') + '#opiniones'},
        calificacion.tienda.usuario,
    )


def avisar_respuesta_opinion(calificacion):
    """Al cliente, cuando el comercio responde su opinión."""
    _programar(
        f'{calificacion.tienda} respondió tu opinión',
        'respuesta_opinion',
        {'calificacion': calificacion, 'tienda': calificacion.tienda,
         'url_ver': _url('detalle_tienda', calificacion.tienda.pk) + '#opiniones'},
        calificacion.consumidor,
    )


# ==========================================
# Donaciones
# ==========================================

def avisar_solicitud_donacion(solicitud):
    """Al comercio, cuando una organización pide un producto."""
    _programar(
        f'Pedido de donación: {solicitud.producto.titulo}',
        'solicitud_donacion',
        {'solicitud': solicitud, 'tienda': solicitud.producto.comercio, 'producto': solicitud.producto,
         'organizacion': solicitud.organizacion},
        solicitud.producto.comercio.usuario,
    )


def avisar_respuesta_donacion(solicitud):
    """A la organización: el comercio aprobó o rechazó su pedido."""
    from scr.bd_lup.stores.ubicacion import url_como_llegar
    from .models import SolicitudDonacion
    aprobada = solicitud.estado == SolicitudDonacion.APROBADA
    tienda = solicitud.producto.comercio
    _programar(
        f'¡{tienda} aprobó tu pedido de donación!' if aprobada else f'Tu pedido de {solicitud.producto.titulo} no pudo concretarse',
        'donacion_aprobada' if aprobada else 'donacion_rechazada',
        {'solicitud': solicitud, 'tienda': tienda, 'producto': solicitud.producto,
         'url_como_llegar': url_como_llegar(tienda), 'url_donaciones': _url('catalogo') + '?donacion=1'},
        solicitud.organizacion,
    )


def avisar_nueva_donacion(producto):
    """A todas las organizaciones con avisos activos: hay un producto nuevo para donar."""
    from scr.bd_lup.users.models import Usuario
    organizaciones = Usuario.objects.filter(rol=Usuario.ORGANIZACION, avisos_email=True, is_active=True).exclude(email='')
    for org in organizaciones:
        _programar(
            f'Nueva donación disponible: {producto.titulo}',
            'nueva_donacion',
            {'producto': producto, 'tienda': producto.comercio, 'url_producto': _url('detalle_producto', producto.pk)},
            org,
        )
