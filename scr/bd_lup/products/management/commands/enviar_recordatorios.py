"""Manda el recordatorio "Hoy es el último día para retirar" a quienes tienen reservas pendientes.

    python manage.py enviar_recordatorios

En la página publicada se manda solo una vez por día (products/recordatorios.py).
En la compu se puede correr a mano para probarlo.
Cada reserva recibe el recordatorio una sola vez.
"""
from django.core.management.base import BaseCommand

from scr.bd_lup.products.recordatorios import enviar_recordatorios_de_hoy


class Command(BaseCommand):
    help = 'Recuerda a los clientes las reservas que vencen hoy.'

    def handle(self, *args, **options):
        enviados = enviar_recordatorios_de_hoy()
        self.stdout.write(self.style.SUCCESS(f'Recordatorios enviados: {enviados}'))
