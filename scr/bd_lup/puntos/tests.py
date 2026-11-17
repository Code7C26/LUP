from datetime import timedelta
from decimal import Decimal

from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.timezone import localdate

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
