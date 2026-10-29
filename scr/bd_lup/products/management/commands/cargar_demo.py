from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.timezone import localdate

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


# Ubicación aproximada de los comercios de demo (centro de Alta Gracia, Córdoba)
UBICACIONES_DEMO = {
    'panaderia_sol': (-31.6553, -64.4293),
    'rotiseria_don_tito': (-31.6592, -64.4318),
    'verde_fresco': (-31.6634, -64.4255),
}


class Command(BaseCommand):
    help = 'Carga comercios, ofertas y usuarios de ejemplo para probar Lüp.'

    @transaction.atomic
    def handle(self, *args, **options):
        hoy = localdate()
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
            if not tienda.tiene_ubicacion and usuario in UBICACIONES_DEMO:
                tienda.latitud, tienda.longitud = UBICACIONES_DEMO[usuario]
                tienda.save(update_fields=['latitud', 'longitud'])
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

        self._historial_demo(consumidor, hoy)

        self.stdout.write(self.style.SUCCESS(
            f'Datos de demo cargados. Usuarios: panaderia_sol, consumidor_demo, comedor_demo · Clave: {CLAVE}'
        ))

    def _historial_demo(self, consumidor, hoy):
        """Retiros de las últimas semanas con calificaciones, para ver estadísticas y opiniones.

        Solo se cargan una vez (si el consumidor de demo todavía no tiene retiros).
        """
        from datetime import datetime, time

        from django.utils import timezone

        from scr.bd_lup.products.models import Calificacion, Reserva

        if Reserva.objects.filter(consumidor=consumidor, estado=Reserva.RETIRADA).exists():
            return
        clientes = [consumidor]
        for nombre in ('Martín', 'Sofía', 'Julián'):
            u, creado = Usuario.objects.get_or_create(
                username=f'cliente_{nombre.lower().replace("í", "i").replace("á", "a")}',
                defaults={'email': f'{nombre.lower()}@lup.demo'.replace('í', 'i').replace('á', 'a'),
                          'first_name': nombre, 'rol': Usuario.CONSUMIDOR},
            )
            if creado:
                u.set_password(CLAVE)
                u.save()
            clientes.append(u)
        opiniones = [
            (5, 'Todo riquísimo y súper bien atendidos.'), (4, 'Muy buena relación precio/calidad.'),
            (5, ''), (3, 'Tuve que esperar un rato, pero valió la pena.'), (5, 'Vuelvo seguro 💚'), (4, ''),
        ]
        n = 0
        for tienda in Tienda.objects.all():
            productos = list(tienda.productos.all())
            for k in range(9):
                producto = productos[k % len(productos)]
                cliente = clientes[k % len(clientes)]
                cantidad = 1 + (k % 3)
                # bulk_create no dispara los avisos por email (son reservas viejas de ejemplo)
                [reserva] = Reserva.objects.bulk_create([Reserva(
                    consumidor=cliente, producto=producto, cantidad=cantidad,
                    precio_total=producto.precio_descuento * cantidad,
                    estado=Reserva.CANCELADA if k == 7 else Reserva.RETIRADA,
                )])
                fecha = hoy - timedelta(days=(k * 3 + n) % 26 + 1)
                Reserva.objects.filter(pk=reserva.pk).update(
                    creada_en=timezone.make_aware(datetime.combine(fecha, time(19, 15)))
                )
                if reserva.estado == Reserva.RETIRADA and k % 4 != 3:
                    puntaje, comentario = opiniones[(k + n) % len(opiniones)]
                    Calificacion.objects.create(
                        reserva=reserva, tienda=tienda, consumidor=cliente, puntaje=puntaje, comentario=comentario,
                    )
            n += 1
