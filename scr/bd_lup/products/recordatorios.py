"""Recordatorio "Hoy es el último día para retirar".

Se puede mandar de dos formas (las dos usan enviar_recordatorios_de_hoy):
  · A mano o con una tarea programada:  python manage.py enviar_recordatorios
  · Solo, en la página publicada: RecordatoriosMiddleware lo dispara una vez por día,
    con la primera visita después de la hora configurada. Así no hace falta un cron aparte.
Cada reserva recibe el recordatorio una sola vez, aunque se dispare desde dos lugares a la vez.
"""
import logging
import threading

from django.conf import settings
from django.db import close_old_connections, transaction
from django.utils.timezone import localdate, localtime

from . import notificaciones
from .models import Reserva

logger = logging.getLogger(__name__)


def enviar_recordatorios_de_hoy():
    """Manda los recordatorios pendientes de hoy. Devuelve cuántos mandó."""
    hoy = localdate()
    ids = list(Reserva.objects.filter(
        estado=Reserva.PENDIENTE, recordatorio_enviado=False, producto__fecha_vencimiento=hoy,
    ).values_list('pk', flat=True))
    enviados = 0
    for pk in ids:
        with transaction.atomic():
            # "Reservar" la reserva antes de mandar: si otro proceso ya la tomó, update devuelve 0
            if not Reserva.objects.filter(pk=pk, recordatorio_enviado=False).update(recordatorio_enviado=True):
                continue
            reserva = Reserva.objects.select_related('consumidor', 'producto__comercio').get(pk=pk)
            notificaciones.recordar_retiro(reserva)
        enviados += 1
    return enviados


class RecordatoriosMiddleware:
    """Una vez por día (desde RECORDATORIOS_HORA) manda los recordatorios en segundo plano."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.ultimo_dia = None
        self.candado = threading.Lock()

    def __call__(self, request):
        respuesta = self.get_response(request)
        ahora = localtime()
        if self.ultimo_dia != ahora.date() and ahora.hour >= settings.RECORDATORIOS_HORA:
            with self.candado:
                if self.ultimo_dia != ahora.date():
                    self.ultimo_dia = ahora.date()
                    threading.Thread(target=self._mandar, daemon=True).start()
        return respuesta

    @staticmethod
    def _mandar():
        try:
            enviados = enviar_recordatorios_de_hoy()
            if enviados:
                logger.warning('Recordatorios de retiro enviados: %s', enviados)
        except Exception:
            logger.exception('No se pudieron mandar los recordatorios de retiro')
        finally:
            close_old_connections()
