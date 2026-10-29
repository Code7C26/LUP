"""Borra todos los datos de muestra que crea `cargar_demo`.

Usalo antes de presentar o publicar la página:

    python manage.py limpiar_demo          (muestra qué se va a borrar y pide confirmación)
    python manage.py limpiar_demo --si     (borra sin preguntar)

Solo toca las cuentas de demo (email @lup.demo). Las cuentas reales, los comercios
reales y sus productos NO se tocan.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from scr.bd_lup.products.models import Calificacion, Producto, Reserva, SolicitudDonacion
from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.users.models import Organizacion, Usuario

DOMINIO_DEMO = '@lup.demo'


def usuarios_demo():
    return Usuario.objects.filter(email__iendswith=DOMINIO_DEMO)


class Command(BaseCommand):
    help = 'Elimina los comercios, productos y usuarios de muestra (email @lup.demo).'

    def add_arguments(self, parser):
        parser.add_argument('--si', action='store_true', help='No pedir confirmación.')

    def handle(self, *args, **options):
        usuarios = usuarios_demo()
        tiendas = Tienda.objects.filter(usuario__in=usuarios)
        productos = Producto.objects.filter(comercio__in=tiendas)
        resumen = {
            'usuarios de muestra': usuarios.count(),
            'comercios de muestra': tiendas.count(),
            'productos de muestra': productos.count(),
            'reservas': Reserva.objects.filter(producto__in=productos).count()
                        + Reserva.objects.filter(consumidor__in=usuarios).exclude(producto__in=productos).count(),
            'pedidos de donación': SolicitudDonacion.objects.filter(producto__in=productos).count(),
            'calificaciones': Calificacion.objects.filter(tienda__in=tiendas).count()
                              + Calificacion.objects.filter(consumidor__in=usuarios).exclude(tienda__in=tiendas).count(),
            'organizaciones de muestra': Organizacion.objects.filter(usuario__in=usuarios).count(),
        }
        if not resumen['usuarios de muestra']:
            self.stdout.write(self.style.SUCCESS('No hay datos de muestra. La base ya está limpia.'))
            return

        self.stdout.write('Se va a borrar:')
        for nombre, cantidad in resumen.items():
            self.stdout.write(f'  · {cantidad} {nombre}')
        if not options['si']:
            respuesta = input('¿Confirmás? Escribí "si" para borrar: ').strip().lower()
            if respuesta not in ('si', 'sí', 's'):
                self.stdout.write('Cancelado. No se borró nada.')
                return

        # Fotos subidas por los productos de muestra (si tuvieran)
        fotos = [p.imagen for p in productos if p.imagen]
        fotos_perfil = [u.foto for u in usuarios if u.foto]
        with transaction.atomic():
            usuarios.delete()  # en cascada: comercios, productos, reservas, donaciones y calificaciones
        for archivo in fotos + fotos_perfil:
            archivo.storage.delete(archivo.name)
        self.stdout.write(self.style.SUCCESS('Listo: se borraron todos los datos de muestra.'))
