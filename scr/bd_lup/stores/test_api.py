"""Tests de la API de comercios (paso 40)."""
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils.timezone import localdate

from scr.bd_lup.products.models import Producto
from scr.bd_lup.users.models import Usuario

from .models import Tienda


def crear_tienda(usuario, nombre, cuit, lat=None, lng=None):
    user = Usuario.objects.create_user(usuario, f'{usuario}@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
    return Tienda.objects.create(
        usuario=user, nombre_fantasia=nombre, rubro='panaderia', cuit=cuit,
        direccion='Belgrano 1', horario_atencion='18 a 20 hs', latitud=lat, longitud=lng,
    )


class ComerciosApiTests(TestCase):
    def setUp(self):
        self.cerca = crear_tienda('cerca', 'Panadería Cerca', '20-11111111-1', -31.6553, -64.4293)
        self.lejos = crear_tienda('lejos', 'Panadería Lejos', '20-22222222-2', -31.7000, -64.5000)
        self.sin_ubicacion = crear_tienda('sinubi', 'Sin ubicación', '20-33333333-3')
        Producto.objects.create(
            comercio=self.lejos, titulo='Pan', descripcion='x', categoria='panificados',
            precio_original=Decimal('100'), precio_descuento=Decimal('50'), stock=3,
            fecha_vencimiento=localdate() + timedelta(days=1),
        )

    def test_ordena_por_cercania(self):
        r = self.client.get('/api/comercios/', {'lat': -31.656, 'lng': -64.43})
        self.assertEqual(r.status_code, 200)
        nombres = [t['nombre_fantasia'] for t in r.json()]
        self.assertEqual(nombres, ['Panadería Cerca', 'Panadería Lejos', 'Sin ubicación'])
        self.assertLess(r.json()[0]['distancia_km'], 1)
        self.assertIsNone(r.json()[2]['distancia_km'])

    def test_sin_ubicacion_ordena_por_ofertas(self):
        r = self.client.get('/api/comercios/')
        self.assertEqual(r.json()[0]['nombre_fantasia'], 'Panadería Lejos')
        self.assertEqual(r.json()[0]['ofertas'], 1)
        self.assertIsNone(r.json()[0]['distancia_km'])

    def test_detalle(self):
        r = self.client.get(f'/api/comercios/{self.cerca.pk}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['nombre_fantasia'], 'Panadería Cerca')
        self.assertIn('google.com/maps', r.json()['como_llegar'])
        self.assertEqual(self.client.get('/api/comercios/9999/').status_code, 404)
