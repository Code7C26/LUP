"""Tests de la API de comercios (paso 40)."""
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from django.utils.timezone import localdate

from scr.bd_lup.products.models import Calificacion, Producto, Reserva
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
        self.assertEqual(r.json()['opiniones'], [])
        self.assertEqual(self.client.get('/api/comercios/9999/').status_code, 404)


class OpinionesDelComercioApiTests(TestCase):
    """GET /api/comercios/<id>/ trae las últimas 20 opiniones; la lista no las trae."""

    def setUp(self):
        self.tienda = crear_tienda('sol', 'Panadería El Sol', '20-44444444-4')
        self.producto = Producto.objects.create(
            comercio=self.tienda, titulo='Medialunas', descripcion='x', categoria='panificados',
            precio_original=Decimal('100'), precio_descuento=Decimal('50'), stock=50,
            fecha_vencimiento=localdate() + timedelta(days=1),
        )
        self.ana = Usuario.objects.create_user(
            'anaperez', 'ana.perez@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR,
            first_name='Ana', last_name='Pérez',
        )
        self.sin_nombre = Usuario.objects.create_user(
            'juan123', 'juan123@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR,
        )

    def opinar(self, consumidor, hace_minutos, **datos):
        reserva = Reserva.objects.create(
            consumidor=consumidor, producto=self.producto, cantidad=1, precio_total=50, estado=Reserva.RETIRADA,
        )
        c = Calificacion.objects.create(
            reserva=reserva, tienda=self.tienda, producto=self.producto, consumidor=consumidor,
            puntaje=datos.pop('puntaje', 4), **datos,
        )
        # Fecha fija para que el orden no dependa de la velocidad del reloj
        Calificacion.objects.filter(pk=c.pk).update(creada_en=timezone.now() - timedelta(minutes=hace_minutos))
        return c

    def test_detalle_trae_las_opiniones_con_respuesta(self):
        self.opinar(self.sin_nombre, hace_minutos=10, puntaje=3)
        self.opinar(
            self.ana, hace_minutos=1, puntaje=5, puntaje_producto=4, comentario='¡Riquísimas!',
            respuesta='¡Gracias, Ana!', respondida_en=timezone.now(),
        )
        r = self.client.get(f'/api/comercios/{self.tienda.pk}/')
        self.assertEqual(r.status_code, 200)
        opiniones = r.json()['opiniones']
        self.assertEqual(len(opiniones), 2)
        reciente = opiniones[0]  # la más nueva primero
        self.assertEqual(reciente['autor'], 'Ana')
        self.assertEqual(reciente['puntaje'], 5)
        self.assertEqual(reciente['puntaje_producto'], 4)
        self.assertEqual(reciente['comentario'], '¡Riquísimas!')
        self.assertEqual(reciente['producto'], 'Medialunas')
        self.assertEqual(reciente['respuesta'], '¡Gracias, Ana!')
        self.assertIsNotNone(reciente['respondida_en'])
        self.assertIsNotNone(reciente['creada_en'])
        # Sin nombre de pila: un nombre genérico, nunca el usuario
        self.assertEqual(opiniones[1]['autor'], 'Cliente de Lüp')
        self.assertIsNone(opiniones[1]['puntaje_producto'])
        self.assertEqual(opiniones[1]['respuesta'], '')
        self.assertIsNone(opiniones[1]['respondida_en'])
        # Privacidad: ni apellido, ni usuario, ni email
        texto = r.content.decode()
        for dato in ('Pérez', 'anaperez', 'juan123', '@lup.test'):
            self.assertNotIn(dato, texto)
        # El promedio y la cantidad siguen igual
        self.assertEqual(r.json()['calificacion_promedio'], 4.0)
        self.assertEqual(r.json()['calificaciones'], 2)

    def test_solo_las_ultimas_20(self):
        for minutos in range(25):
            self.opinar(self.ana, hace_minutos=minutos, comentario=f'Opinión {minutos}')
        opiniones = self.client.get(f'/api/comercios/{self.tienda.pk}/').json()['opiniones']
        self.assertEqual(len(opiniones), 20)
        self.assertEqual(opiniones[0]['comentario'], 'Opinión 0')
        self.assertEqual(opiniones[-1]['comentario'], 'Opinión 19')

    def test_la_lista_no_trae_opiniones(self):
        self.opinar(self.ana, hace_minutos=1)
        r = self.client.get('/api/comercios/')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json())
        for comercio in r.json():
            self.assertNotIn('opiniones', comercio)
