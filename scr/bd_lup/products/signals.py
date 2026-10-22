"""Conecta los avisos por email con los modelos.

Al usar signals, los avisos funcionan igual desde la web y desde la API de la app.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from . import notificaciones
from .models import Reserva, SolicitudDonacion


@receiver(post_save, sender=Reserva)
def aviso_reserva(sender, instance, created, update_fields=None, **kwargs):
    if created:
        notificaciones.avisar_nueva_reserva(instance)
    elif instance.estado == Reserva.CANCELADA and update_fields and 'estado' in update_fields:
        notificaciones.avisar_reserva_cancelada(instance)


@receiver(post_save, sender=SolicitudDonacion)
def aviso_solicitud(sender, instance, created, **kwargs):
    if created:
        notificaciones.avisar_solicitud_donacion(instance)
