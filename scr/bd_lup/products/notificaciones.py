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

NOTIFICACIONES PUSH: los avisos importantes también llegan al celular, aunque la app esté
cerrada (users/push.py): reservas, cancelaciones, sin stock, donaciones, opiniones y el
recordatorio de retiro. Son aparte del email: se apagan desde el permiso del celular.
Al tocarlas, la app abre la pantalla que dice "pantalla".

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
from django.db import connection, transaction
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils import translation

from scr.bd_lup.users import push

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


def _push_en_hilo(tokens, titulo, cuerpo, datos):
    try:
        push.enviar_a_tokens(tokens, titulo, cuerpo, datos)
    finally:
        connection.close()  # el hilo abrió su propia conexión a la base (para borrar tokens vencidos)


def _programar_push(usuarios, titulo, cuerpo, datos=None):
    """Notificación push a los celulares de esas personas, cuando termina de guardarse todo."""
    if _silencio.get():
        return

    def tarea():
        from scr.bd_lup.users.models import DispositivoPush
        tokens = list(DispositivoPush.objects.filter(usuario__in=usuarios, usuario__is_active=True)
                      .values_list('token', flat=True))
        if not tokens:
            return
        if settings.EMAIL_EN_SEGUNDO_PLANO:
            threading.Thread(target=_push_en_hilo, args=(tokens, titulo, cuerpo, datos), daemon=True).start()
        else:
            push.enviar_a_tokens(tokens, titulo, cuerpo, datos)

    transaction.on_commit(tarea)


def _nombre(usuario):
    return usuario.first_name or usuario.nombre_visible


# ==========================================
# Todos
# ==========================================

def bienvenida(usuario):
    _programar('¡Bienvenido/a a Lüp! 🌱', 'bienvenida', {'nombre': _nombre(usuario)}, usuario, obligatorio=True)


def recuperar_clave(usuario, url):
    """Link para elegir una contraseña nueva (users/forms.py → RecuperarClaveForm). Llega aunque tenga los avisos apagados."""
    _programar('Cambiá tu contraseña de Lüp', 'recuperar_clave',
               {'nombre': _nombre(usuario), 'url_recuperar': url}, usuario, obligatorio=True)


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
    _programar_push(
        [reserva.producto.comercio.usuario], 'Te hicieron una reserva 🛍️',
        f'{_nombre(reserva.consumidor)} reservó {reserva.cantidad} × {reserva.producto.titulo}. '
        f'Código {reserva.codigo_retiro}.',
        {'pantalla': 'ConfirmarRetiro'},
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
    _programar_push(
        [reserva.producto.comercio.usuario], 'Cancelaron una reserva',
        f'{_nombre(reserva.consumidor)} canceló {reserva.cantidad} × {reserva.producto.titulo}.',
        {'pantalla': 'MisProductos'},
    )


def recordar_retiro(reserva):
    """El día que vence: "Hoy es el último día para retirar"."""
    _programar(
        f'Hoy es el último día para retirar {reserva.producto.titulo}',
        'recordatorio_retiro', _contexto_reserva(reserva), reserva.consumidor,
    )
    _programar_push(
        [reserva.consumidor], 'Hoy es el último día para retirar ⏰',
        f'{reserva.producto.titulo} en {reserva.producto.comercio}. Tu código: {reserva.codigo_retiro}.',
        {'pantalla': 'MisReservas'},
    )


def pedir_opinion(reserva):
    """Cuando el comercio confirma el retiro: "¿Cómo te fue?"."""
    _programar(
        f'¿Cómo te fue con {reserva.producto.titulo}?',
        'pedir_opinion',
        {**_contexto_reserva(reserva), 'url_opinar': _url('calificar_reserva', reserva.pk)},
        reserva.consumidor,
    )
    _programar_push(
        [reserva.consumidor], f'¿Cómo te fue con {reserva.producto.titulo}?',
        f'Contale a {reserva.producto.comercio} con unas estrellas.',
        {'pantalla': 'MisReservas'},
    )


def avisar_sin_stock(producto):
    """Al comercio: las reservas agotaron el producto."""
    _programar(
        f'¡Se agotó {producto.titulo}!',
        'sin_stock',
        {'producto': producto, 'tienda': producto.comercio, 'url_editar': _url('editar_excedente', producto.pk)},
        producto.comercio.usuario,
    )
    _programar_push(
        [producto.comercio.usuario], f'¡Se agotó {producto.titulo}!',
        'Las reservas se llevaron todo. Si te queda más, publicalo de nuevo.',
        {'pantalla': 'MisProductos'},
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
    _programar_push(
        [calificacion.tienda.usuario], f'Nueva opinión: {calificacion.puntaje}★',
        f'{_nombre(calificacion.consumidor)} opinó sobre {calificacion.reserva.producto.titulo}.',
        {'pantalla': 'DetalleComercio', 'id': calificacion.tienda.pk},
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
    _programar_push(
        [calificacion.consumidor], f'{calificacion.tienda} respondió tu opinión',
        calificacion.respuesta[:120],
        {'pantalla': 'DetalleComercio', 'id': calificacion.tienda.pk},
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
    _programar_push(
        [solicitud.producto.comercio.usuario], 'Te pidieron una donación 💚',
        f'{solicitud.organizacion.nombre_visible} pidió {solicitud.producto.titulo}.',
        {'pantalla': 'Solicitudes'},
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
    if aprobada:
        _programar_push(
            [solicitud.organizacion], '¡Aceptaron tu donación! 🎉',
            f'{tienda} aprobó tu pedido de {solicitud.producto.titulo}. Pasá a retirarlo.',
            {'pantalla': 'MisSolicitudes'},
        )
    else:
        _programar_push(
            [solicitud.organizacion], 'Tu pedido de donación no pudo concretarse',
            f'{tienda} no pudo darte {solicitud.producto.titulo}. Fijate si hay otras donaciones cerca.',
            {'pantalla': 'MisSolicitudes'},
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
    # Push: a todas las organizaciones con la app (aunque tengan los emails apagados)
    _programar_push(
        Usuario.objects.filter(rol=Usuario.ORGANIZACION),
        'Nueva donación disponible 💚', f'{producto.comercio} publicó {producto.titulo} para donar.',
        {'pantalla': 'DetalleProducto', 'id': producto.pk},
    )
