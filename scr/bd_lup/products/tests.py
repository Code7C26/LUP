from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.users.models import Organizacion, Usuario

from .models import Producto, Reserva, SolicitudDonacion


class FlujoLupTests(TestCase):
    def setUp(self):
        self.comercio = Usuario.objects.create_user('panaderia', 'p@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        self.tienda = Tienda.objects.create(
            usuario=self.comercio, nombre_fantasia='Panadería Sol', rubro='panaderia',
            direccion='Belgrano 1', cuit='20-11111111-1', horario_atencion='18 a 20 hs',
        )
        self.consumidor = Usuario.objects.create_user('cliente', 'c@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        self.org = Usuario.objects.create_user('comedor', 'o@lup.test', 'Clave#2026', rol=Usuario.ORGANIZACION)
        Organizacion.objects.create(usuario=self.org, nombre='Comedor', cuit='30-22222222-2', direccion='X')
        self.producto = Producto.objects.create(
            comercio=self.tienda, titulo='Medialunas', descripcion='Docena', categoria='panificados',
            precio_original=Decimal('3000'), precio_descuento=Decimal('1200'), stock=5,
            fecha_vencimiento=date.today() + timedelta(days=1), es_donacion=True,
        )

    def test_porcentaje_descuento(self):
        self.assertEqual(self.producto.porcentaje_descuento, 60)

    def test_catalogo_y_filtros(self):
        r = self.client.get(reverse('catalogo'), {'q': 'medialuna'})
        self.assertContains(r, 'Medialunas')
        r = self.client.get(reverse('catalogo'), {'q': 'pizza'})
        self.assertNotContains(r, 'Medialunas')
        r = self.client.get(reverse('catalogo'), {'categoria': 'panificados'}, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertTemplateUsed(r, 'products/_grilla.html')
        self.assertContains(r, 'Medialunas')

    def test_vencidos_no_aparecen(self):
        self.producto.fecha_vencimiento = date.today() - timedelta(days=1)
        self.producto.save()
        self.assertNotContains(self.client.get(reverse('catalogo')), 'Medialunas')

    def test_detalle_por_rol(self):
        url = reverse('detalle_producto', args=[self.producto.pk])
        self.assertContains(self.client.get(url), 'Iniciá sesión como consumidor')
        for usuario in (self.consumidor, self.org, self.comercio):
            self.client.force_login(usuario)
            self.assertEqual(self.client.get(url).status_code, 200)

    def test_comercio_publica_edita_y_elimina(self):
        self.client.force_login(self.comercio)
        self.assertEqual(self.client.get(reverse('publicar_excedente')).status_code, 200)
        r = self.client.post(reverse('publicar_excedente'), {
            'titulo': 'Vianda', 'categoria': 'comidas', 'descripcion': 'Pollo con papas',
            'precio_original': '5000', 'precio_descuento': '2500', 'stock': '3',
            'fecha_vencimiento': date.today().isoformat(),
        })
        self.assertRedirects(r, reverse('panel'))
        vianda = Producto.objects.get(titulo='Vianda')
        self.assertEqual(vianda.comercio, self.tienda)

        r = self.client.post(reverse('editar_excedente', args=[vianda.pk]), {
            'titulo': 'Vianda XL', 'categoria': 'comidas', 'descripcion': 'Pollo',
            'precio_original': '5000', 'precio_descuento': '2000', 'stock': '2',
            'fecha_vencimiento': date.today().isoformat(),
        })
        self.assertRedirects(r, reverse('panel'))
        vianda.refresh_from_db()
        self.assertEqual(vianda.titulo, 'Vianda XL')

        self.client.post(reverse('eliminar_excedente', args=[vianda.pk]))
        self.assertFalse(Producto.objects.filter(pk=vianda.pk).exists())

    def test_precio_lup_mayor_al_original_es_invalido(self):
        self.client.force_login(self.comercio)
        r = self.client.post(reverse('publicar_excedente'), {
            'titulo': 'Caro', 'categoria': 'otros', 'descripcion': 'x', 'precio_original': '100',
            'precio_descuento': '200', 'stock': '1', 'fecha_vencimiento': date.today().isoformat(),
        })
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Producto.objects.filter(titulo='Caro').exists())

    def test_solo_comercios_publican(self):
        self.client.force_login(self.consumidor)
        self.assertRedirects(self.client.get(reverse('publicar_excedente')), reverse('catalogo'))

    def test_otro_comercio_no_puede_eliminar(self):
        otro = Usuario.objects.create_user('otro', 'otro@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        self.client.force_login(otro)
        r = self.client.post(reverse('eliminar_excedente', args=[self.producto.pk]))
        self.assertEqual(r.status_code, 404)
        self.assertTrue(Producto.objects.filter(pk=self.producto.pk).exists())

    def test_reserva_retiro_y_cancelacion(self):
        self.client.force_login(self.consumidor)
        r = self.client.post(reverse('reservar', args=[self.producto.pk]), {'cantidad': 2})
        self.assertRedirects(r, reverse('panel'))
        reserva = Reserva.objects.get()
        self.assertEqual(reserva.precio_total, Decimal('2400'))
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 3)
        self.assertContains(self.client.get(reverse('panel')), reserva.codigo_retiro)

        # No se puede reservar más que el stock
        self.client.post(reverse('reservar', args=[self.producto.pk]), {'cantidad': 10})
        self.assertEqual(Reserva.objects.count(), 1)

        # El comercio confirma el retiro con el código
        self.client.force_login(self.comercio)
        self.assertContains(self.client.get(reverse('panel')), reserva.codigo_retiro)
        self.client.post(reverse('confirmar_retiro'), {'codigo': reserva.codigo_retiro.lower()})
        reserva.refresh_from_db()
        self.assertEqual(reserva.estado, Reserva.RETIRADA)

        # Una segunda reserva cancelada devuelve el stock
        self.client.force_login(self.consumidor)
        self.client.post(reverse('reservar', args=[self.producto.pk]), {'cantidad': 3})
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.estado, Producto.AGOTADO)
        segunda = Reserva.objects.get(estado=Reserva.PENDIENTE)
        self.client.post(reverse('cancelar_reserva', args=[segunda.pk]))
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 3)
        self.assertEqual(self.producto.estado, Producto.DISPONIBLE)

    def test_solo_consumidores_reservan(self):
        self.client.force_login(self.org)
        self.client.post(reverse('reservar', args=[self.producto.pk]), {'cantidad': 1})
        self.assertFalse(Reserva.objects.exists())

    def test_donacion(self):
        self.client.force_login(self.org)
        r = self.client.post(reverse('solicitar_donacion', args=[self.producto.pk]), {'mensaje': 'Para 40 chicos'})
        self.assertRedirects(r, reverse('panel'))
        solicitud = SolicitudDonacion.objects.get()

        self.client.force_login(self.comercio)
        self.assertContains(self.client.get(reverse('panel')), 'Para 40 chicos')
        self.client.post(reverse('responder_donacion', args=[solicitud.pk, 'aprobar']))
        solicitud.refresh_from_db()
        self.producto.refresh_from_db()
        self.assertEqual(solicitud.estado, SolicitudDonacion.APROBADA)
        self.assertEqual(self.producto.estado, Producto.DONADO)

        self.client.force_login(self.org)
        self.assertContains(self.client.get(reverse('panel')), 'Aprobada')

    def test_paneles_y_paginas(self):
        for usuario in (self.consumidor, self.comercio, self.org):
            self.client.force_login(usuario)
            for url in (reverse('panel'), reverse('perfil'), reverse('home')):
                with self.subTest(usuario=usuario.username, url=url):
                    self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.get(reverse('detalle_tienda', args=[self.tienda.pk])).status_code, 200)

    def test_api_productos(self):
        r = self.client.get('/api/productos/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]['porcentaje_descuento'], 60)
