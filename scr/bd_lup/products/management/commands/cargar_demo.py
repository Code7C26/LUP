from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from scr.bd_lup.products.models import Producto
from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.users.models import Organizacion, Usuario

CLAVE = 'LupDemo2026!'

COMERCIOS = [
    ('panaderia_sol', 'Panadería El Sol', 'panaderia', '20-30111222-3', 'Belgrano 120, Alta Gracia', 'Lun a Sáb de 19 a 20:30 hs', [
        ('Docena de medialunas', 'panificados', 'Medialunas de manteca horneadas hoy.', 4200, 1700, 6, True),
        ('Bolsa sorpresa de panadería', 'bolsa_sorpresa', 'Pan, facturas y algún budín del día.', 6000, 2200, 4, False),
    ]),
    ('rotiseria_don_tito', 'Rotisería Don Tito', 'restaurante', '20-30222333-4', 'San Martín 455, Alta Gracia', 'Todos los días de 21 a 22 hs', [
        ('Vianda de pollo con papas', 'comidas', 'Porción abundante de pollo al horno con papas.', 7500, 3500, 5, False),
        ('Tarta de verduras entera', 'comidas', 'Tarta de acelga y queso, ideal para 4 personas.', 9000, 4000, 2, True),
    ]),
    ('verde_fresco', 'Verdulería Verde Fresco', 'verduleria', '27-30333444-5', 'Av. Libertador 900, Alta Gracia', 'Lun a Vie de 18 a 19 hs', [
        ('Bolsa de verduras para sopa', 'frutas_verduras', 'Zanahoria, zapallo, puerro y apio. Ideal para hoy.', 3500, 1200, 8, True),
        ('Cajón de bananas maduras', 'frutas_verduras', 'Perfectas para licuados o budín.', 5000, 1500, 3, False),
    ]),
]


class Command(BaseCommand):
    help = 'Carga comercios, ofertas y usuarios de ejemplo para probar Lüp.'

    @transaction.atomic
    def handle(self, *args, **options):
        hoy = date.today()
        for i, (usuario, nombre, rubro, cuit, direccion, horario, productos) in enumerate(COMERCIOS):
            user, creado = Usuario.objects.get_or_create(
                username=usuario, defaults={'email': f'{usuario}@lup.demo', 'rol': Usuario.COMERCIO}
            )
            if creado:
                user.set_password(CLAVE)
                user.save()
            tienda, _ = Tienda.objects.get_or_create(
                usuario=user,
                defaults=dict(nombre_fantasia=nombre, rubro=rubro, cuit=cuit, direccion=direccion, horario_atencion=horario),
            )
            for j, (titulo, cat, desc, orig, desc_precio, stock, donable) in enumerate(productos):
                Producto.objects.get_or_create(
                    comercio=tienda, titulo=titulo,
                    defaults=dict(
                        categoria=cat, descripcion=desc, precio_original=Decimal(orig),
                        precio_descuento=Decimal(desc_precio), stock=stock, es_donacion=donable,
                        fecha_vencimiento=hoy + timedelta(days=(i + j) % 3),
                    ),
                )

        consumidor, creado = Usuario.objects.get_or_create(
            username='consumidor_demo',
            defaults={'email': 'consumidor@lup.demo', 'first_name': 'Lucía', 'rol': Usuario.CONSUMIDOR},
        )
        if creado:
            consumidor.set_password(CLAVE)
            consumidor.save()

        org_user, creado = Usuario.objects.get_or_create(
            username='comedor_demo', defaults={'email': 'comedor@lup.demo', 'rol': Usuario.ORGANIZACION}
        )
        if creado:
            org_user.set_password(CLAVE)
            org_user.save()
        Organizacion.objects.get_or_create(
            usuario=org_user,
            defaults=dict(nombre='Comedor Manos Unidas', tipo='comedor', cuit='30-70111222-9',
                          direccion='Sarmiento 300, Alta Gracia', personas_asistidas=120),
        )

        self.stdout.write(self.style.SUCCESS(
            f'Datos de demo cargados. Usuarios: panaderia_sol, consumidor_demo, comedor_demo · Clave: {CLAVE}'
        ))
