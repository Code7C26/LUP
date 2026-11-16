"""Los productos del documento "Sistema de Puntos - LUP" (se editan después en /admin)."""
from decimal import Decimal

from django.db import migrations

MERCH = [
    # nombre, descripción, precio, puntos, ícono
    ('Lápiz de semillas', 'Cuando se gasta, se planta y crece una planta.', '2000', 30, 'bi-pencil'),
    ('Imán', 'Para la heladera, con el logo de Lüp.', '3000', 45, 'bi-magnet'),
    ('Bolsa', 'Bolsa reutilizable para ir a buscar tus compras.', '15000', 225, 'bi-bag'),
    ('Tupper', 'Para llevarte la comida que rescatás.', '15000', 225, 'bi-box-seam'),
    ('Botella de vidrio', 'Botella reutilizable de vidrio.', '20000', 300, 'bi-cup-straw'),
]


def crear(apps, schema_editor):
    ProductoMerch = apps.get_model('puntos', 'ProductoMerch')
    for orden, (nombre, descripcion, precio, puntos, icono) in enumerate(MERCH):
        ProductoMerch.objects.get_or_create(
            nombre=nombre,
            defaults={'descripcion': descripcion, 'precio': Decimal(precio), 'puntos': puntos,
                      'icono': icono, 'orden': orden},
        )


class Migration(migrations.Migration):
    dependencies = [('puntos', '0001_initial')]
    operations = [migrations.RunPython(crear, migrations.RunPython.noop)]
