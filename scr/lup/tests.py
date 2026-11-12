"""Pruebas de la configuración para publicar la página."""
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.core import mail
from django.test import RequestFactory, TestCase, override_settings
from django.utils.timezone import localdate, localtime

from scr.bd_lup.products.models import Producto, Reserva
from scr.bd_lup.products.recordatorios import RecordatoriosMiddleware, enviar_recordatorios_de_hoy
from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.users.models import Usuario

from .settings import _base_de_datos


class ConfiguracionTests(TestCase):
    def test_database_url_de_render(self):
        db = _base_de_datos('postgresql://lup:cl%40ve@dpg-abc.virginia-postgres.render.com:5432/lup')
        self.assertEqual(db['ENGINE'], 'django.db.backends.postgresql')
        self.assertEqual((db['USER'], db['PASSWORD'], db['NAME']), ('lup', 'cl@ve', 'lup'))
        self.assertEqual((db['HOST'], db['PORT']), ('dpg-abc.virginia-postgres.render.com', '5432'))
        sin_puerto = _base_de_datos('postgres://u:p@dpg-abc-a/base')
        self.assertEqual((sin_puerto['HOST'], sin_puerto['PORT']), ('dpg-abc-a', ''))

    def test_database_url_invalida(self):
        from django.core.exceptions import ImproperlyConfigured
        with self.assertRaises(ImproperlyConfigured):
            _base_de_datos('mysql://u:p@host/base')

    def test_salud(self):
        r = self.client.get('/salud/', HTTP_HOST='cualquiera.internal')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.content, b'ok')


@override_settings(EMAIL_EN_SEGUNDO_PLANO=False, PUSH_ACTIVADO=False, RECORDATORIOS_HORA=9)
class RecordatoriosTests(TestCase):
    def setUp(self):
        comercio = Usuario.objects.create_user('pan', 'p@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        tienda = Tienda.objects.create(usuario=comercio, nombre_fantasia='Pan', rubro='panaderia',
                                       direccion='Belgrano 1', cuit='20-11111111-1', horario_atencion='9 a 20')
        cliente = Usuario.objects.create_user('cli', 'c@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        producto = Producto.objects.create(
            comercio=tienda, titulo='Medialunas', descripcion='x', categoria='panificados',
            precio_original=Decimal('100'), precio_descuento=Decimal('50'), stock=5, fecha_vencimiento=localdate(),
        )
        self.reserva = Reserva.objects.create(producto=producto, consumidor=cliente, cantidad=1, precio_total=Decimal('50'))
        mail.outbox.clear()

    def test_una_sola_vez(self):
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(enviar_recordatorios_de_hoy(), 1)
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(enviar_recordatorios_de_hoy(), 0)
        self.assertEqual([m.to for m in mail.outbox], [['c@lup.test']])
        self.reserva.refresh_from_db()
        self.assertTrue(self.reserva.recordatorio_enviado)

    def test_middleware_una_vez_por_dia_desde_la_hora(self):
        mw = RecordatoriosMiddleware(lambda r: 'respuesta')
        pedido = RequestFactory().get('/')
        temprano = localtime().replace(hour=8)
        tarde = localtime().replace(hour=10)
        with mock.patch('scr.bd_lup.products.recordatorios.threading.Thread') as hilo:
            with mock.patch('scr.bd_lup.products.recordatorios.localtime', return_value=temprano):
                self.assertEqual(mw(pedido), 'respuesta')
            hilo.assert_not_called()
            with mock.patch('scr.bd_lup.products.recordatorios.localtime', return_value=tarde):
                mw(pedido)
                mw(pedido)
            self.assertEqual(hilo.call_count, 1)
            with mock.patch('scr.bd_lup.products.recordatorios.localtime', return_value=tarde + timedelta(days=1)):
                mw(pedido)
            self.assertEqual(hilo.call_count, 2)
