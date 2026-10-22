"""Avisos por email (Gmail) a los comercios.

Se disparan solos desde signals.py cada vez que:
  · un consumidor reserva un producto (web o app),
  · un consumidor cancela una reserva,
  · una organización pide un producto en donación.

El envío se hace recién cuando la reserva quedó guardada (transaction.on_commit)
y en segundo plano, así un problema con Gmail nunca rompe ni demora la reserva.
"""
import logging
import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.template.loader import render_to_string
from django.urls import reverse

logger = logging.getLogger(__name__)


def _destinatario(tienda):
    """Email del comercio, o None si no quiere avisos o no tiene email."""
    if tienda is None or not tienda.notificaciones_email:
        return None
    return tienda.usuario.email or None


def _enviar(asunto, plantilla, contexto, destinatario):
    contexto = {**contexto, 'sitio_url': settings.SITIO_URL, 'url_panel': settings.SITIO_URL + reverse('panel')}
    texto = render_to_string(f'emails/{plantilla}.txt', contexto)
    html = render_to_string(f'emails/{plantilla}.html', contexto)
    mensaje = EmailMultiAlternatives(asunto, texto, settings.DEFAULT_FROM_EMAIL, [destinatario])
    mensaje.attach_alternative(html, 'text/html')
    try:
        mensaje.send()
    except Exception:  # Gmail caído, clave mal puesta, sin internet...
        logger.exception('No se pudo enviar el aviso "%s" a %s', asunto, destinatario)


def _programar(asunto, plantilla, contexto, destinatario):
    """Envía el email cuando termina de guardarse todo (y en segundo plano si está activado)."""
    if not destinatario:
        return

    def tarea():
        if settings.EMAIL_EN_SEGUNDO_PLANO:
            threading.Thread(target=_enviar, args=(asunto, plantilla, contexto, destinatario), daemon=True).start()
        else:
            _enviar(asunto, plantilla, contexto, destinatario)

    transaction.on_commit(tarea)


def avisar_nueva_reserva(reserva):
    tienda = reserva.producto.comercio
    _programar(
        f'Nueva reserva: {reserva.cantidad} × {reserva.producto.titulo}',
        'nueva_reserva',
        {'reserva': reserva, 'tienda': tienda, 'producto': reserva.producto, 'cliente': reserva.consumidor},
        _destinatario(tienda),
    )


def avisar_reserva_cancelada(reserva):
    tienda = reserva.producto.comercio
    _programar(
        f'Reserva cancelada: {reserva.cantidad} × {reserva.producto.titulo}',
        'reserva_cancelada',
        {'reserva': reserva, 'tienda': tienda, 'producto': reserva.producto, 'cliente': reserva.consumidor},
        _destinatario(tienda),
    )


def avisar_solicitud_donacion(solicitud):
    tienda = solicitud.producto.comercio
    _programar(
        f'Pedido de donación: {solicitud.producto.titulo}',
        'solicitud_donacion',
        {'solicitud': solicitud, 'tienda': tienda, 'producto': solicitud.producto, 'organizacion': solicitud.organizacion},
        _destinatario(tienda),
    )
