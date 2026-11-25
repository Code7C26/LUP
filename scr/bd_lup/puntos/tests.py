from datetime import timedelta
from decimal import Decimal

from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.timezone import localdate
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from scr.bd_lup.products.models import Producto, Reserva
from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.users.models import Usuario

from .models import Canje, MovimientoPuntos, ProductoMerch, puntos_por_monto, saldo_de
from .servicios import CanjeError, acreditar_compra, canjear


@override_settings(EMAIL_EN_SEGUNDO_PLANO=False, PUSH_ACTIVADO=False, SOPORTE_EMAIL='equipo@lup.test')
class PuntosTests(TestCase):
    def setUp(self):
        self.comercio = Usuario.objects.create_user('pan', 'p@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        tienda = Tienda.objects.create(usuario=self.comercio, nombre_fantasia='Pan', rubro='panaderia',
                                       direccion='Belgrano 1', cuit='20-11111111-1', horario_atencion='9 a 20')
        self.cliente = Usuario.objects.create_user('cli', 'c@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        self.producto = Producto.objects.create(
            comercio=tienda, titulo='Tarta', descripcion='x', categoria='comidas',
            precio_original=Decimal('5000'), precio_descuento=Decimal('3250'), stock=10,
            fecha_vencimiento=localdate() + timedelta(days=1),
        )
        self.lapiz = ProductoMerch.objects.get(nombre='Lápiz de semillas')

    def reserva(self, total, cantidad=1):
        return Reserva.objects.create(producto=self.producto, consumidor=self.cliente, cantidad=cantidad,
                                      precio_total=Decimal(total))

    def sumar(self, puntos):
        MovimientoPuntos.objects.create(usuario=self.cliente, puntos=puntos, motivo=MovimientoPuntos.AJUSTE)

    def test_tabla_del_documento(self):
        for monto, esperado in [(1900, 0), (2000, 1), (3900, 1), (4000, 2), (6500, 3), (0, 0)]:
            self.assertEqual(puntos_por_monto(Decimal(monto)), esperado, monto)

    def test_merch_del_documento(self):
        self.assertEqual(
            list(ProductoMerch.objects.values_list('nombre', 'puntos', 'precio')),
            [('Lápiz de semillas', 30, Decimal('2000')), ('Imán', 45, Decimal('3000')), ('Bolsa', 225, Decimal('15000')),
             ('Tupper', 225, Decimal('15000')), ('Botella de vidrio', 300, Decimal('20000'))],
        )

    def test_suma_al_retirar_una_sola_vez(self):
        r = self.reserva('6500')
        self.assertEqual(saldo_de(self.cliente), 0)          # reservar no suma
        r.marcar_retirada()
        self.assertEqual(saldo_de(self.cliente), 3)
        self.assertEqual(acreditar_compra(r), 0)             # confirmar dos veces no duplica
        self.assertEqual(saldo_de(self.cliente), 3)

    def test_confirmar_retiro_web_suma_y_avisa(self):
        r = self.reserva('4000')
        self.client.force_login(self.comercio)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(reverse('confirmar_retiro'), {'codigo': r.codigo_retiro})
        self.assertEqual(saldo_de(self.cliente), 2)
        opinion = [m for m in mail.outbox if m.to == ['c@lup.test']][-1]
        self.assertIn('sumaste 2 puntos Lüp', opinion.body)

    def test_canje_descuenta_y_cancelar_devuelve(self):
        self.sumar(40)
        self.client.force_login(self.cliente)
        with self.captureOnCommitCallbacks(execute=True):
            r = self.client.post(reverse('canjear_merch', args=[self.lapiz.pk]), follow=True)
        canje = Canje.objects.get()
        self.assertContains(r, canje.codigo)
        self.assertEqual(saldo_de(self.cliente), 10)
        self.assertEqual(sorted(m.to[0] for m in mail.outbox), ['c@lup.test', 'equipo@lup.test'])

        self.client.post(reverse('cancelar_canje', args=[canje.pk]))
        canje.refresh_from_db()
        self.assertEqual(canje.estado, Canje.CANCELADO)
        self.assertEqual(saldo_de(self.cliente), 40)
        r = self.client.post(reverse('cancelar_canje', args=[canje.pk]), follow=True)   # no devuelve dos veces
        self.assertEqual(saldo_de(self.cliente), 40)

    def test_no_alcanza(self):
        self.sumar(29)
        with self.assertRaises(CanjeError):
            canjear(self.cliente, self.lapiz.pk)
        self.assertEqual(saldo_de(self.cliente), 29)
        self.assertFalse(Canje.objects.exists())

    def test_solo_consumidores(self):
        with self.assertRaises(CanjeError):
            canjear(self.comercio, self.lapiz.pk)
        self.client.force_login(self.comercio)
        r = self.client.get(reverse('mis_puntos'))
        self.assertContains(r, 'Los puntos son para cuentas de consumidor.')

    def test_no_cancela_canje_ajeno(self):
        self.sumar(30)
        canje = canjear(self.cliente, self.lapiz.pk)
        otro = Usuario.objects.create_user('otro', 'o@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        self.client.force_login(otro)
        self.assertEqual(self.client.post(reverse('cancelar_canje', args=[canje.pk])).status_code, 404)

    def test_paginas(self):
        r = self.client.get(reverse('mis_puntos'))
        self.assertContains(r, 'Botella de vidrio')
        self.assertContains(r, 'nav-destacado')
        self.client.force_login(self.cliente)
        self.sumar(50)
        r = self.client.get(reverse('mis_puntos'))
        self.assertContains(r, 'chip-puntos')
        self.assertContains(r, reverse('canjear_merch', args=[self.lapiz.pk]))
        self.assertNotContains(r, reverse('canjear_merch', args=[ProductoMerch.objects.get(nombre='Bolsa').pk]))
        self.assertContains(self.client.get(reverse('panel')), 'stat-puntos')
        self.assertContains(self.client.get(reverse('nosotros')), 'Proyectos a futuro')


@override_settings(EMAIL_EN_SEGUNDO_PLANO=False, PUSH_ACTIVADO=False, SOPORTE_EMAIL='equipo@lup.test')
class PuntosApiTests(TestCase):
    """La API de la app (puntos/api.py): mismas reglas que la web, con token y solo para consumidores."""

    def setUp(self):
        self.comercio = Usuario.objects.create_user('pan', 'p@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        tienda = Tienda.objects.create(usuario=self.comercio, nombre_fantasia='Panadería El Sol', rubro='panaderia',
                                       direccion='Belgrano 1', cuit='20-11111111-1', horario_atencion='9 a 20')
        self.cliente = Usuario.objects.create_user('cli', 'c@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        self.producto = Producto.objects.create(
            comercio=tienda, titulo='Tarta', descripcion='x', categoria='comidas',
            precio_original=Decimal('5000'), precio_descuento=Decimal('3250'), stock=10,
            fecha_vencimiento=localdate() + timedelta(days=1),
        )
        self.lapiz = ProductoMerch.objects.get(nombre='Lápiz de semillas')
        self.api = APIClient()
        self.con_token(self.cliente)

    def con_token(self, usuario):
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.get_or_create(user=usuario)[0].key}')

    def sumar(self, puntos):
        MovimientoPuntos.objects.create(usuario=self.cliente, puntos=puntos, motivo=MovimientoPuntos.AJUSTE)

    def reserva(self, total):
        return Reserva.objects.create(producto=self.producto, consumidor=self.cliente, cantidad=1,
                                      precio_total=Decimal(total))

    def canjear(self, merch_id, **extra):
        with self.captureOnCommitCallbacks(execute=True):
            return self.api.post(reverse('api_canjear_merch', args=[merch_id]), **extra)

    # ---------- GET /api/puntos/ ----------
    def test_saldo_merch_canjes_y_movimientos(self):
        self.reserva('6500').marcar_retirada()      # +3 por la compra
        self.sumar(40)
        canje = canjear(self.cliente, self.lapiz.pk)  # -30
        r = self.api.get(reverse('api_puntos'))
        self.assertEqual(r.status_code, 200)
        datos = r.json()
        self.assertEqual(datos['saldo'], 13)
        self.assertEqual(datos['pesos_por_punto'], 2000)
        merch = {m['nombre']: m for m in datos['merch']}
        self.assertEqual(len(merch), 5)
        lapiz = merch['Lápiz de semillas']
        self.assertEqual(set(lapiz), {'id', 'nombre', 'descripcion', 'precio', 'puntos', 'imagen', 'icono',
                                      'puedo_canjear'})
        self.assertEqual((lapiz['id'], lapiz['puntos']), (self.lapiz.pk, 30))
        self.assertTrue(lapiz['imagen'].endswith('.jpg') and 'img/merch/lapiz-semillas' in lapiz['imagen'])
        # cada producto del merch inicial trae su foto
        self.assertTrue(all(m['imagen'] for m in merch.values()))
        self.assertFalse(lapiz['puedo_canjear'])    # quedan 13
        self.assertEqual(datos['canjes'], [{
            'id': canje.id, 'producto': 'Lápiz de semillas', 'puntos': 30, 'codigo': canje.codigo,
            'estado': 'pendiente', 'creado_en': datos['canjes'][0]['creado_en'],
        }])
        movimientos = [(m['puntos'], m['motivo'], m['detalle'], m['comercio']) for m in datos['movimientos']]
        self.assertEqual(movimientos, [
            (-30, 'canje', 'Lápiz de semillas', None),
            (40, 'ajuste', '', None),
            (3, 'compra', '1 × Tarta', 'Panadería El Sol'),
        ])

    def test_puedo_canjear_segun_el_saldo(self):
        self.sumar(225)
        merch = {m['nombre']: m['puedo_canjear'] for m in self.api.get(reverse('api_puntos')).json()['merch']}
        self.assertEqual(merch, {'Lápiz de semillas': True, 'Imán': True, 'Bolsa': True, 'Tupper': True,
                                 'Botella de vidrio': False})

    def test_merch_inactivo_no_aparece(self):
        ProductoMerch.objects.filter(pk=self.lapiz.pk).update(activo=False)
        nombres = [m['nombre'] for m in self.api.get(reverse('api_puntos')).json()['merch']]
        self.assertNotIn('Lápiz de semillas', nombres)

    def test_ultimos_30_movimientos_y_20_canjes(self):
        self.sumar(5000)
        for _ in range(35):   # 36 movimientos y 35 canjes
            canjear(self.cliente, self.lapiz.pk)
        datos = self.api.get(reverse('api_puntos')).json()
        self.assertEqual(len(datos['movimientos']), 30)
        self.assertEqual(len(datos['canjes']), 20)
        self.assertEqual(datos['saldo'], 5000 - 35 * 30)   # el saldo cuenta todos, no solo los 30 que se muestran

    # ---------- POST /api/puntos/canjear/<id>/ ----------
    def test_canjear_con_puntos_suficientes(self):
        self.sumar(40)
        r = self.canjear(self.lapiz.pk)
        self.assertEqual(r.status_code, 201)
        canje = Canje.objects.get()
        self.assertEqual(r.json()['canje']['codigo'], canje.codigo)
        self.assertEqual(r.json()['saldo'], 10)
        self.assertIn(canje.codigo, r.json()['mensaje'])
        self.assertEqual(saldo_de(self.cliente), 10)
        # Avisa igual que la web: a quien canjeó y al equipo
        self.assertEqual(sorted(m.to[0] for m in mail.outbox), ['c@lup.test', 'equipo@lup.test'])

    def test_canjear_sin_puntos_suficientes(self):
        self.sumar(29)
        r = self.canjear(self.lapiz.pk)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'Te faltan 1 puntos para canjear Lápiz de semillas.')
        self.assertFalse(Canje.objects.exists())
        self.assertEqual(saldo_de(self.cliente), 29)
        self.assertEqual(mail.outbox, [])

    def test_canjear_en_ingles(self):
        self.sumar(29)
        r = self.canjear(self.lapiz.pk, HTTP_ACCEPT_LANGUAGE='en')
        self.assertEqual(r.json()['error'], 'You need 1 more points to redeem Lápiz de semillas.')

    def test_canjear_producto_inactivo_o_inexistente(self):
        self.sumar(500)
        ProductoMerch.objects.filter(pk=self.lapiz.pk).update(activo=False)
        for merch_id in (self.lapiz.pk, 99999):
            r = self.canjear(merch_id)
            self.assertEqual(r.status_code, 400)
            self.assertEqual(r.json()['error'], 'Ese producto ya no está disponible para canjear.')
        self.assertFalse(Canje.objects.exists())

    # ---------- POST /api/puntos/canjes/<id>/cancelar/ ----------
    def test_cancelar_devuelve_los_puntos_una_sola_vez(self):
        self.sumar(40)
        canje = canjear(self.cliente, self.lapiz.pk)
        url = reverse('api_cancelar_canje', args=[canje.pk])
        r = self.api.post(url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['canje']['estado'], 'cancelado')
        self.assertEqual(r.json()['saldo'], 40)
        r = self.api.post(url)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['error'], 'Ese canje ya no se puede cancelar.')
        self.assertEqual(saldo_de(self.cliente), 40)

    def test_no_cancela_canje_ajeno(self):
        self.sumar(30)
        canje = canjear(self.cliente, self.lapiz.pk)
        otro = Usuario.objects.create_user('otro', 'o@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        self.con_token(otro)
        self.assertEqual(self.api.post(reverse('api_cancelar_canje', args=[canje.pk])).status_code, 404)
        canje.refresh_from_db()
        self.assertEqual(canje.estado, Canje.PENDIENTE)

    # ---------- Solo consumidores, con token ----------
    def test_comercio_no_puede_usarla(self):
        self.sumar(30)
        canje = canjear(self.cliente, self.lapiz.pk)
        self.con_token(self.comercio)
        self.assertEqual(self.api.get(reverse('api_puntos')).status_code, 403)
        self.assertEqual(self.api.post(reverse('api_canjear_merch', args=[self.lapiz.pk])).status_code, 403)
        self.assertEqual(self.api.post(reverse('api_cancelar_canje', args=[canje.pk])).status_code, 403)
        self.assertEqual(Canje.objects.get().estado, Canje.PENDIENTE)

    def test_sin_token_no(self):
        self.api.credentials()
        self.assertEqual(self.api.get(reverse('api_puntos')).status_code, 401)
        self.api.force_login(self.cliente)   # la sesión de la web no cuenta: solo el token de la app
        self.assertEqual(self.api.get(reverse('api_puntos')).status_code, 401)

    # ---------- Mis reservas: "puntos_sumados" en las retiradas ----------
    def test_mis_reservas_con_puntos_sumados(self):
        retirada = self.reserva('6500')
        retirada.marcar_retirada()
        chica = self.reserva('1500')
        chica.marcar_retirada()
        pendiente = self.reserva('4000')
        reservas = {r['id']: r for r in self.api.get(reverse('api_mis_reservas')).json()}
        self.assertEqual(reservas[retirada.id]['puntos_sumados'], 3)
        self.assertEqual(reservas[chica.id]['puntos_sumados'], 0)
        self.assertNotIn('puntos_sumados', reservas[pendiente.id])


class FotosMerchTests(TestCase):
    def test_cada_producto_inicial_tiene_su_foto(self):
        esperadas = {'Lápiz de semillas': 'lapiz-semillas', 'Imán': 'iman', 'Bolsa': 'bolsa',
                     'Tupper': 'tupper', 'Botella de vidrio': 'botella'}
        for p in ProductoMerch.objects.all():
            self.assertIn(f'img/merch/{esperadas[p.nombre]}', p.foto_url)

    def test_la_foto_subida_en_admin_tiene_prioridad(self):
        p = ProductoMerch.objects.get(nombre='Bolsa')
        p.imagen.name = 'merch/bolsa-nueva.jpg'
        self.assertEqual(p.foto_url, '/media/merch/bolsa-nueva.jpg')

    def test_producto_sin_foto_usa_el_icono(self):
        p = ProductoMerch.objects.create(nombre='Gorra', precio=Decimal('9000'), puntos=135, icono='bi-gem')
        self.assertIsNone(p.foto_url)
        r = self.client.get(reverse('mis_puntos'))
        self.assertContains(r, 'bi-gem')
        self.assertContains(r, 'img/merch/botella')
        self.assertContains(r, 'alt="Tupper"')
