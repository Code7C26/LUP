"""Tests del catálogo de la API (paso 41): búsqueda, filtros y distancia."""
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils.timezone import localdate

from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.users.models import Usuario

from .models import Producto


def crear_tienda(usuario, nombre, cuit, rubro, lat=None, lng=None):
    user = Usuario.objects.create_user(usuario, f'{usuario}@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
    return Tienda.objects.create(
        usuario=user, nombre_fantasia=nombre, rubro=rubro, cuit=cuit, direccion='Belgrano 1',
        horario_atencion='18 a 20 hs', latitud=lat, longitud=lng,
    )


def crear_producto(tienda, titulo, categoria, precio, donacion=False):
    return Producto.objects.create(
        comercio=tienda, titulo=titulo, descripcion='Rico', categoria=categoria,
        precio_original=Decimal('1000'), precio_descuento=Decimal(precio), stock=3,
        fecha_vencimiento=localdate() + timedelta(days=1), es_donacion=donacion,
    )


class CatalogoApiTests(TestCase):
    def setUp(self):
        self.panaderia = crear_tienda('pan', 'Panadería Cerca', '20-11111111-1', 'panaderia', -31.6553, -64.4293)
        self.verduleria = crear_tienda('verdu', 'Verdulería Lejos', '20-22222222-2', 'verduleria', -31.7000, -64.5000)
        self.medialunas = crear_producto(self.panaderia, 'Medialunas', 'panificados', '400', donacion=True)
        self.zapallo = crear_producto(self.verduleria, 'Zapallo', 'frutas_verduras', '200')

    def titulos(self, **params):
        r = self.client.get('/api/productos/', params)
        self.assertEqual(r.status_code, 200)
        return [p['titulo'] for p in r.json()]

    def test_busqueda_por_texto(self):
        self.assertEqual(self.titulos(q='medialuna'), ['Medialunas'])
        self.assertEqual(self.titulos(q='verdulería'), ['Zapallo'])
        self.assertEqual(self.titulos(q='pizza'), [])

    def test_filtros(self):
        self.assertEqual(self.titulos(categoria='panificados'), ['Medialunas'])
        self.assertEqual(self.titulos(rubro='verduleria'), ['Zapallo'])
        self.assertEqual(self.titulos(comercio=self.panaderia.pk), ['Medialunas'])
        self.assertEqual(self.titulos(donacion='1'), ['Medialunas'])

    def test_orden_por_precio(self):
        self.assertEqual(self.titulos(orden='precio'), ['Zapallo', 'Medialunas'])

    def test_cercania_y_distancia(self):
        r = self.client.get('/api/productos/', {'lat': -31.656, 'lng': -64.43, 'orden': 'cercania'})
        datos = r.json()
        self.assertEqual([p['titulo'] for p in datos], ['Medialunas', 'Zapallo'])
        self.assertLess(datos[0]['distancia_km'], 1)
        self.assertEqual(datos[0]['comercio_id'], self.panaderia.pk)
        self.assertEqual(datos[0]['categoria_texto'], 'Panificados')

    def test_sin_ubicacion_no_hay_distancia(self):
        self.assertIsNone(self.client.get('/api/productos/').json()[0]['distancia_km'])
