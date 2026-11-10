"""Manda el recordatorio "Hoy es el último día para retirar" a quienes tienen reservas pendientes.

    python manage.py enviar_recordatorios

Conviene programarlo una vez por día a la mañana (ej. 9:00):
  · En el hosting: una tarea programada / cron  →  0 9 * * *  python manage.py enviar_recordatorios
  · En Windows: Programador de tareas.
Cada reserva recibe el recordatorio una sola vez.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.timezone import localdate

from scr.bd_lup.products import notificaciones
from scr.bd_lup.products.models import Reserva


class Command(BaseCommand):
    help = 'Recuerda a los clientes las reservas que vencen hoy.'

    def handle(self, *args, **options):
        reservas = Reserva.objects.filter(
            estado=Reserva.PENDIENTE, recordatorio_enviado=False, producto__fecha_vencimiento=localdate(),
        ).select_related('consumidor', 'producto__comercio')
        enviados = 0
        for reserva in reservas:
            with transaction.atomic():
                notificaciones.recordar_retiro(reserva)
                reserva.recordatorio_enviado = True
                reserva.save(update_fields=['recordatorio_enviado'])
            enviados += 1
        self.stdout.write(self.style.SUCCESS(f'Recordatorios enviados: {enviados}'))
