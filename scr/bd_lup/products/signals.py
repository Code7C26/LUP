"""Conecta los avisos por email con los modelos.

Al usar signals, los avisos funcionan igual desde la web y desde la API de la app.
(Ver la lista completa de avisos en notificaciones.py.)
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from . import notificaciones
from .models import Calificacion, Producto, Reserva, SolicitudDonacion


@receiver(post_save, sender=Reserva)
def aviso_reserva(sender, instance, created, update_fields=None, **kwargs):
    if created:
        notificaciones.avisar_nueva_reserva(instance)
    elif instance.estado == Reserva.CANCELADA and update_fields and 'estado' in update_fields:
        notificaciones.avisar_reserva_cancelada(instance)
    elif instance.estado == Reserva.RETIRADA and update_fields and 'retirada_en' in update_fields:
        # El comercio confirmó el retiro: le preguntamos al cliente cómo le fue
        notificaciones.pedir_opinion(instance)


@receiver(post_save, sender=Producto)
def aviso_producto(sender, instance, created, update_fields=None, **kwargs):
    if created and instance.es_donacion and instance.esta_disponible:
        notificaciones.avisar_nueva_donacion(instance)
    elif (update_fields and 'stock' in update_fields
          and instance.stock == 0 and instance.estado == Producto.AGOTADO):
        # Las reservas se llevaron la última unidad
        notificaciones.avisar_sin_stock(instance)


@receiver(post_save, sender=SolicitudDonacion)
def aviso_solicitud(sender, instance, created, update_fields=None, **kwargs):
    if created:
        notificaciones.avisar_solicitud_donacion(instance)
    elif update_fields and 'estado' in update_fields and instance.estado in (
        SolicitudDonacion.APROBADA, SolicitudDonacion.RECHAZADA
    ):
        notificaciones.avisar_respuesta_donacion(instance)


@receiver(post_save, sender=Calificacion)
def aviso_opinion(sender, instance, created, **kwargs):
    if created:
        notificaciones.avisar_nueva_opinion(instance)
