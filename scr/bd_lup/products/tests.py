from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils.timezone import localdate

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
            fecha_vencimiento=localdate() + timedelta(days=1), es_donacion=True,
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
        self.producto.fecha_vencimiento = localdate() - timedelta(days=1)
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
            'fecha_vencimiento': localdate().isoformat(),
        })
        self.assertRedirects(r, reverse('panel'))
        vianda = Producto.objects.get(titulo='Vianda')
        self.assertEqual(vianda.comercio, self.tienda)

        r = self.client.post(reverse('editar_excedente', args=[vianda.pk]), {
            'titulo': 'Vianda XL', 'categoria': 'comidas', 'descripcion': 'Pollo',
            'precio_original': '5000', 'precio_descuento': '2000', 'stock': '2',
            'fecha_vencimiento': localdate().isoformat(),
        })
        self.assertRedirects(r, reverse('panel'))
        vianda.refresh_from_db()
        self.assertEqual(vianda.titulo, 'Vianda XL')

        self.client.post(reverse('eliminar_excedente', args=[vianda.pk]))
        self.assertFalse(Producto.objects.filter(pk=vianda.pk).exists())

    def test_api_editar_producto_agotado_lo_vuelve_a_publicar(self):
        self.producto.stock = 0
        self.producto.estado = Producto.AGOTADO
        self.producto.save()
        self.client.force_login(self.comercio)
        url = f'/api/mis-productos/{self.producto.pk}/'

        r = self.client.patch(url, {'stock': 0}, content_type='application/json')
        self.assertEqual(r.status_code, 400)

        r = self.client.patch(url, {'stock': 4}, content_type='application/json')
        self.assertEqual(r.status_code, 200)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.estado, Producto.DISPONIBLE)
        self.assertEqual(self.producto.stock, 4)

    def test_api_organizacion_pide_una_donacion(self):
        # Solo las organizaciones ven las donaciones
        self.client.force_login(self.consumidor)
        self.assertEqual(self.client.get('/api/donaciones/').status_code, 403)

        self.client.force_login(self.org)
        donaciones = self.client.get('/api/donaciones/').json()
        self.assertEqual([(d['titulo'], d['ya_solicitado']) for d in donaciones], [('Medialunas', False)])

        url = f'/api/productos/{self.producto.pk}/solicitar-donacion/'
        self.assertEqual(self.client.post(url, {'mensaje': ' '}, content_type='application/json').status_code, 400)
        r = self.client.post(url, {'mensaje': 'Para 40 chicos'}, content_type='application/json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['comercio'], 'Panadería Sol')
        # Una sola solicitud por producto
        self.assertEqual(self.client.post(url, {'mensaje': 'Otra'}, content_type='application/json').status_code, 400)

        self.assertTrue(self.client.get('/api/donaciones/').json()[0]['ya_solicitado'])
        solicitudes = self.client.get('/api/mis-solicitudes-donacion/').json()
        self.assertEqual(len(solicitudes), 1)
        self.assertEqual(solicitudes[0]['estado'], SolicitudDonacion.PENDIENTE)
        self.assertEqual(solicitudes[0]['direccion'], 'Belgrano 1')

    def test_precio_lup_mayor_al_original_es_invalido(self):
        self.client.force_login(self.comercio)
        r = self.client.post(reverse('publicar_excedente'), {
            'titulo': 'Caro', 'categoria': 'otros', 'descripcion': 'x', 'precio_original': '100',
            'precio_descuento': '200', 'stock': '1', 'fecha_vencimiento': localdate().isoformat(),
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

    def test_accion_de_donacion_invalida_da_404(self):
        solicitud = SolicitudDonacion.objects.create(organizacion=self.org, producto=self.producto, mensaje='Hola')
        self.client.force_login(self.comercio)
        r = self.client.post(reverse('responder_donacion', args=[solicitud.pk, 'borrar']))
        self.assertEqual(r.status_code, 404)
        solicitud.refresh_from_db()
        self.assertEqual(solicitud.estado, SolicitudDonacion.PENDIENTE)

    def test_no_se_aprueba_donacion_de_producto_vencido(self):
        solicitud = SolicitudDonacion.objects.create(organizacion=self.org, producto=self.producto, mensaje='Hola')
        self.producto.fecha_vencimiento = localdate() - timedelta(days=1)
        self.producto.save()
        self.client.force_login(self.comercio)
        self.client.post(reverse('responder_donacion', args=[solicitud.pk, 'aprobar']))
        solicitud.refresh_from_db()
        self.producto.refresh_from_db()
        self.assertEqual(solicitud.estado, SolicitudDonacion.PENDIENTE)
        self.assertEqual(self.producto.estado, Producto.DISPONIBLE)

    def test_ahorro_usa_el_precio_pagado(self):
        self.client.force_login(self.consumidor)
        self.client.post(reverse('reservar', args=[self.producto.pk]), {'cantidad': 2})
        # Si el comercio cambia el precio después, el ahorro de la reserva no cambia
        self.producto.precio_descuento = Decimal('100')
        self.producto.save()
        r = self.client.get(reverse('panel'))
        self.assertEqual(r.context['stats']['ahorro'], Decimal('3600'))

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


# ==========================================================
# Avisos por email (Gmail) a los comercios
# ==========================================================
from unittest import mock  # noqa: E402

from django.core import mail  # noqa: E402
from django.test import override_settings  # noqa: E402


@override_settings(EMAIL_EN_SEGUNDO_PLANO=False, SITIO_URL='https://lup.test')
class AvisosEmailTests(FlujoLupTests.__bases__[0]):
    setUp = FlujoLupTests.setUp

    def reservar_web(self, cantidad=2):
        self.client.force_login(self.consumidor)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(reverse('reservar', args=[self.producto.pk]), {'cantidad': cantidad})
        return Reserva.objects.get(consumidor=self.consumidor)

    def test_nueva_reserva_avisa_al_comercio(self):
        reserva = self.reservar_web()
        self.assertEqual(len(mail.outbox), 1)
        aviso = mail.outbox[0]
        self.assertEqual(aviso.to, ['p@lup.test'])
        self.assertIn('Nueva reserva: 2 × Medialunas', aviso.subject)
        self.assertIn(reserva.codigo_retiro, aviso.body)
        self.assertIn('https://lup.test/panel/', aviso.body)
        html = aviso.alternatives[0][0]
        self.assertIn(reserva.codigo_retiro, html)
        self.assertIn('$2.400', html)

    def test_cancelacion_avisa_al_comercio(self):
        reserva = self.reservar_web()
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(reverse('cancelar_reserva', args=[reserva.pk]))
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn('Reserva cancelada', mail.outbox[1].subject)

    def test_retiro_confirmado_no_manda_email(self):
        reserva = self.reservar_web()
        self.client.force_login(self.comercio)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(reverse('confirmar_retiro'), {'codigo': reserva.codigo_retiro})
        self.assertEqual(len(mail.outbox), 1)

    def test_pedido_de_donacion_avisa_al_comercio(self):
        self.client.force_login(self.org)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(reverse('solicitar_donacion', args=[self.producto.pk]), {'mensaje': 'Para 40 chicos'})
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Pedido de donación: Medialunas', mail.outbox[0].subject)
        self.assertIn('Para 40 chicos', mail.outbox[0].body)

    def test_reserva_desde_la_app_tambien_avisa(self):
        self.client.force_login(self.consumidor)
        with self.captureOnCommitCallbacks(execute=True):
            r = self.client.post(reverse('api_reservar', args=[self.producto.pk]), {'cantidad': 1})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)

    def test_comercio_puede_desactivar_los_avisos(self):
        self.tienda.notificaciones_email = False
        self.tienda.save()
        self.reservar_web()
        self.assertEqual(len(mail.outbox), 0)

    def test_si_gmail_falla_la_reserva_igual_se_hace(self):
        with mock.patch('django.core.mail.EmailMultiAlternatives.send', side_effect=OSError('sin internet')):
            with self.assertLogs('scr.bd_lup.products.notificaciones', level='ERROR'):
                reserva = self.reservar_web()
        self.assertEqual(reserva.estado, Reserva.PENDIENTE)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 3)


# ==========================================================
# Ubicación del dispositivo y Google Maps
# ==========================================================

class UbicacionTests(FlujoLupTests.__bases__[0]):
    setUp = FlujoLupTests.setUp

    def crear_tienda_lejana(self):
        lejos = Usuario.objects.create_user('lejos', 'l@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        tienda = Tienda.objects.create(
            usuario=lejos, nombre_fantasia='Verdulería Lejos', rubro='verduleria', direccion='Ruta 5',
            cuit='20-33333333-3', horario_atencion='9 a 12', latitud=-31.42, longitud=-64.18,  # Córdoba capital
        )
        Producto.objects.create(
            comercio=tienda, titulo='Bananas', descripcion='Cajón', precio_original=Decimal('100'),
            precio_descuento=Decimal('50'), stock=2, fecha_vencimiento=localdate() + timedelta(days=1),
        )

    def test_distancia_km(self):
        from scr.bd_lup.stores.ubicacion import distancia_km
        # Alta Gracia → Córdoba capital: unos 36 km en línea recta
        self.assertAlmostEqual(distancia_km(-31.6587, -64.4300, -31.4201, -64.1888), 35, delta=3)

    def test_catalogo_ordena_por_cercania(self):
        self.tienda.latitud, self.tienda.longitud = -31.6553, -64.4293  # Alta Gracia
        self.tienda.save()
        self.crear_tienda_lejana()
        # Persona parada en Córdoba capital: primero lo de Córdoba
        r = self.client.get(reverse('catalogo'), {'orden': 'cercania', 'lat': '-31.4201', 'lng': '-64.1888', 'radio': 'todos'})
        html = r.content.decode()
        self.assertLess(html.index('Bananas'), html.index('Medialunas'))
        self.assertContains(r, 'class="distancia"')
        # Persona en Alta Gracia: al revés
        r = self.client.get(reverse('catalogo'), {'orden': 'cercania', 'lat': '-31.6587', 'lng': '-64.4300', 'radio': 'todos'})
        html = r.content.decode()
        self.assertLess(html.index('Medialunas'), html.index('Bananas'))

    def test_comercio_sin_ubicacion_queda_al_final(self):
        self.crear_tienda_lejana()
        r = self.client.get(reverse('catalogo'), {'orden': 'cercania', 'lat': '-31.6587', 'lng': '-64.4300', 'radio': 'todos'})
        html = r.content.decode()
        self.assertLess(html.index('Bananas'), html.index('Medialunas'))

    def test_coordenadas_invalidas_se_ignoran(self):
        r = self.client.get(reverse('catalogo'), {'orden': 'cercania', 'lat': 'hola', 'lng': '999'})
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, 'Medialunas')
        self.assertNotContains(r, 'class="distancia"')

    def test_detalle_muestra_mapa_y_como_llegar(self):
        self.tienda.latitud, self.tienda.longitud = -31.6553, -64.4293
        self.tienda.save()
        r = self.client.get(reverse('detalle_producto', args=[self.producto.pk]))
        self.assertContains(r, 'https://www.google.com/maps/dir/?api=1&amp;destination=-31.6553%2C-64.4293')
        self.assertContains(r, 'output=embed')
        self.assertContains(r, 'data-distancia-a="-31.6553,-64.4293"')
        # Página pública del comercio
        self.assertContains(self.client.get(reverse('detalle_tienda', args=[self.tienda.pk])), 'Cómo llegar')

    @override_settings(GOOGLE_MAPS_API_KEY='CLAVE-TEST')
    def test_con_clave_usa_la_api_oficial(self):
        r = self.client.get(reverse('detalle_producto', args=[self.producto.pk]))
        self.assertContains(r, 'https://www.google.com/maps/embed/v1/place?key=CLAVE-TEST')

    def datos_perfil_comercio(self, **extra):
        datos = {
            'u-first_name': '', 'u-last_name': '', 'u-email': 'p@lup.test', 'u-telefono': '', 'u-ciudad': '',
            'p-nombre_fantasia': 'Panadería Sol', 'p-rubro': 'panaderia', 'p-descripcion': '',
            'p-direccion': 'Belgrano 1', 'p-horario_atencion': '18 a 20 hs', 'p-notificaciones_email': 'on',
            'p-latitud': '', 'p-longitud': '',
        }
        datos.update(extra)
        return datos

    def test_comercio_guarda_la_ubicacion_del_dispositivo(self):
        self.client.force_login(self.comercio)
        r = self.client.post(reverse('perfil'), self.datos_perfil_comercio(**{'p-latitud': '-31.6553', 'p-longitud': '-64.4293'}))
        self.assertRedirects(r, reverse('perfil'))
        self.tienda.refresh_from_db()
        self.assertAlmostEqual(self.tienda.latitud, -31.6553)
        self.assertContains(self.client.get(reverse('perfil')), 'Ubicación guardada')

    def test_comercio_puede_apagar_los_avisos(self):
        self.client.force_login(self.comercio)
        datos = self.datos_perfil_comercio()
        del datos['p-notificaciones_email']
        self.client.post(reverse('perfil'), datos)
        self.tienda.refresh_from_db()
        self.assertFalse(self.tienda.notificaciones_email)

    @override_settings(GOOGLE_MAPS_API_KEY='CLAVE-TEST')
    def test_con_clave_ubica_el_comercio_por_su_direccion(self):
        self.client.force_login(self.comercio)
        with mock.patch('scr.bd_lup.stores.ubicacion.geocodificar', return_value=(-31.66, -64.43)) as geo:
            # importado dentro de TiendaForm.save, así que se parchea el módulo de origen
            self.client.post(reverse('perfil'), self.datos_perfil_comercio(**{'p-direccion': 'Belgrano 999, Alta Gracia'}))
        geo.assert_called_once_with('Belgrano 999, Alta Gracia')
        self.tienda.refresh_from_db()
        self.assertEqual((self.tienda.latitud, self.tienda.longitud), (-31.66, -64.43))


# ==========================================================
# #93 · Marcar producto como vendido o no disponible
# ==========================================================

class EstadoManualTests(FlujoLupTests.__bases__[0]):
    setUp = FlujoLupTests.setUp

    def cambiar(self, estado, usuario=None):
        self.client.force_login(usuario or self.comercio)
        return self.client.post(reverse('cambiar_estado_producto', args=[self.producto.pk]), {'estado': estado})

    def test_marcar_como_vendido_lo_saca_del_catalogo(self):
        self.assertRedirects(self.cambiar(Producto.AGOTADO), reverse('panel'))
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.estado, Producto.AGOTADO)
        self.assertNotContains(self.client.get(reverse('catalogo')), 'Medialunas')
        self.assertContains(self.client.get(reverse('panel')), 'Vendido')

    def test_no_disponible_y_volver_a_publicar(self):
        self.cambiar(Producto.PAUSADO)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.estado, Producto.PAUSADO)
        self.assertFalse(self.producto.esta_disponible)
        self.assertContains(self.client.get(reverse('panel')), 'No disponible')
        self.cambiar(Producto.DISPONIBLE)
        self.producto.refresh_from_db()
        self.assertTrue(self.producto.esta_disponible)

    def test_no_se_reserva_un_producto_no_disponible(self):
        self.cambiar(Producto.PAUSADO)
        self.client.force_login(self.consumidor)
        self.client.post(reverse('reservar', args=[self.producto.pk]), {'cantidad': 1})
        self.assertFalse(Reserva.objects.exists())

    def test_sin_stock_no_se_puede_volver_a_publicar(self):
        self.producto.stock = 0
        self.producto.estado = Producto.AGOTADO
        self.producto.save()
        r = self.cambiar(Producto.DISPONIBLE)
        self.assertRedirects(r, reverse('editar_excedente', args=[self.producto.pk]))
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.estado, Producto.AGOTADO)

    def test_otro_comercio_no_puede_cambiarlo(self):
        otro = Usuario.objects.create_user('otro', 'x@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        self.assertEqual(self.cambiar(Producto.AGOTADO, usuario=otro).status_code, 404)

    def test_estado_invalido_o_donado(self):
        self.cambiar('DONADO')
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.estado, Producto.DISPONIBLE)

    def test_api_acepta_no_disponible(self):
        self.client.force_login(self.comercio)
        r = self.client.post(reverse('api_cambiar_estado', args=[self.producto.pk]), {'estado': 'PAUSADO'})
        self.assertEqual(r.status_code, 200)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.estado, Producto.PAUSADO)


# ==========================================================
# #98 · Sistema de calificaciones
# ==========================================================

class CalificacionesTests(FlujoLupTests.__bases__[0]):
    setUp = FlujoLupTests.setUp

    def reserva_retirada(self, consumidor=None):
        return Reserva.objects.create(
            consumidor=consumidor or self.consumidor, producto=self.producto, cantidad=1,
            precio_total=self.producto.precio_descuento, estado=Reserva.RETIRADA,
        )

    def calificar(self, reserva, puntaje, comentario=''):
        self.client.force_login(reserva.consumidor)
        return self.client.post(reverse('calificar_reserva', args=[reserva.pk]), {'puntaje': puntaje, 'comentario': comentario})

    def test_consumidor_califica_despues_de_retirar(self):
        reserva = self.reserva_retirada()
        self.client.force_login(self.consumidor)
        self.assertContains(self.client.get(reverse('panel')), '¿Qué tal te fue?')
        self.assertRedirects(self.calificar(reserva, 5, 'Riquísimas'), reverse('panel'))
        from .models import Calificacion
        c = Calificacion.objects.get()
        self.assertEqual((c.puntaje, c.tienda, c.comentario), (5, self.tienda, 'Riquísimas'))
        self.assertNotContains(self.client.get(reverse('panel')), '¿Qué tal te fue?')

    def test_volver_a_calificar_la_actualiza(self):
        from .models import Calificacion
        reserva = self.reserva_retirada()
        self.calificar(reserva, 2)
        self.calificar(reserva, 4)
        self.assertEqual(Calificacion.objects.get().puntaje, 4)

    def test_no_se_califica_una_reserva_pendiente_ni_ajena(self):
        from .models import Calificacion
        pendiente = Reserva.objects.create(consumidor=self.consumidor, producto=self.producto, cantidad=1, precio_total=1)
        self.assertEqual(self.calificar(pendiente, 5).status_code, 404)
        otro = Usuario.objects.create_user('otro', 'otro@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        ajena = self.reserva_retirada(otro)
        self.client.force_login(self.consumidor)
        r = self.client.post(reverse('calificar_reserva', args=[ajena.pk]), {'puntaje': 1})
        self.assertEqual(r.status_code, 404)
        self.assertFalse(Calificacion.objects.exists())

    def test_puntaje_fuera_de_rango(self):
        from .models import Calificacion
        self.calificar(self.reserva_retirada(), 9)
        self.assertFalse(Calificacion.objects.exists())

    def test_promedio_en_tienda_catalogo_y_panel(self):
        otro = Usuario.objects.create_user('otro', 'otro@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        self.calificar(self.reserva_retirada(), 5, 'Excelente atención')
        self.calificar(self.reserva_retirada(otro), 4)
        r = self.client.get(reverse('detalle_tienda', args=[self.tienda.pk]))
        self.assertContains(r, '4,5')
        self.assertContains(r, 'Excelente atención')
        self.assertContains(r, '2 opiniones')
        self.assertContains(self.client.get(reverse('catalogo')), 'calif-mini')
        self.client.force_login(self.comercio)
        self.assertContains(self.client.get(reverse('panel')), '4,5')

    def test_api_calificar_y_promedio_del_comercio(self):
        reserva = self.reserva_retirada()
        self.client.force_login(self.consumidor)
        r = self.client.post(reverse('api_calificar_reserva', args=[reserva.pk]), {'puntaje': 3, 'comentario': 'Bien'}, content_type='application/json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['calificacion'], {'puntaje': 3, 'comentario': 'Bien'})
        datos = self.client.get(reverse('api_detalle_comercio', args=[self.tienda.pk])).json()
        self.assertEqual((datos['calificacion_promedio'], datos['calificaciones']), (3.0, 1))
        # Los campos que ya usaba la app siguen estando
        for campo in ('id', 'nombre_fantasia', 'ofertas', 'distancia_km', 'como_llegar'):
            self.assertIn(campo, datos)


# ==========================================================
# #99 · Estadísticas para cada comercio
# ==========================================================

class EstadisticasTests(FlujoLupTests.__bases__[0]):
    setUp = FlujoLupTests.setUp

    def reserva(self, cantidad, estado, dias_atras=0):
        from datetime import datetime, time

        from django.utils import timezone

        r = Reserva.objects.create(
            consumidor=self.consumidor, producto=self.producto, cantidad=cantidad,
            precio_total=self.producto.precio_descuento * cantidad, estado=estado,
        )
        fecha = localdate() - timedelta(days=dias_atras)
        Reserva.objects.filter(pk=r.pk).update(creada_en=timezone.make_aware(datetime.combine(fecha, time(12))))
        return r

    def test_numeros_del_periodo(self):
        self.reserva(2, Reserva.RETIRADA, 1)
        self.reserva(3, Reserva.RETIRADA, 5)
        self.reserva(1, Reserva.CANCELADA, 2)
        self.reserva(4, Reserva.RETIRADA, 40)  # fuera de los últimos 30 días
        self.client.force_login(self.comercio)
        r = self.client.get(reverse('estadisticas_comercio'))
        self.assertEqual(r.status_code, 200)
        k = r.context['kpis']
        self.assertEqual(k['unidades'], 5)
        self.assertEqual(k['ingresos'], Decimal('6000'))
        self.assertEqual(k['reservas'], 3)
        self.assertEqual(k['tasa_retiro'], 67)
        self.assertEqual(k['ahorro_clientes'], Decimal('9000'))  # (3000-1200) × 5
        self.assertEqual(len(r.context['serie']), 30)
        self.assertEqual(r.context['top'][0]['producto__titulo'], 'Medialunas')
        # Con 90 días entra la reserva vieja
        r = self.client.get(reverse('estadisticas_comercio'), {'dias': '90'})
        self.assertEqual(r.context['kpis']['unidades'], 9)
        self.assertEqual(len(r.context['serie']), 90)

    def test_periodo_invalido_usa_30_dias(self):
        self.client.force_login(self.comercio)
        r = self.client.get(reverse('estadisticas_comercio'), {'dias': 'mil'})
        self.assertEqual(r.context['periodo'], '30')

    def test_sin_datos_muestra_mensaje(self):
        self.client.force_login(self.comercio)
        self.assertContains(self.client.get(reverse('estadisticas_comercio')), 'Todavía no hay retiros')

    def test_solo_comercios(self):
        self.client.force_login(self.consumidor)
        self.assertNotEqual(self.client.get(reverse('estadisticas_comercio')).status_code, 200)

    def test_cada_comercio_ve_solo_lo_suyo(self):
        self.reserva(2, Reserva.RETIRADA, 1)
        otro = Usuario.objects.create_user('otro', 'otro@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        Tienda.objects.create(usuario=otro, nombre_fantasia='Otra', rubro='otro', direccion='Y',
                              cuit='20-99999999-9', horario_atencion='x')
        self.client.force_login(otro)
        self.assertEqual(self.client.get(reverse('estadisticas_comercio')).context['kpis']['unidades'], 0)

    def test_demo_carga_historial_sin_mandar_emails(self):
        from django.core import mail
        from django.core.management import call_command
        from io import StringIO
        call_command('cargar_demo', '--forzar', stdout=StringIO())
        call_command('cargar_demo', '--forzar', stdout=StringIO())  # se puede correr dos veces
        self.assertEqual(len(mail.outbox), 0)
        self.assertTrue(Reserva.objects.filter(estado=Reserva.RETIRADA, consumidor__username='consumidor_demo').exists())


# ==========================================================
# Datos de muestra: limpiar_demo / cargar_demo
# ==========================================================

class DatosDeMuestraTests(FlujoLupTests.__bases__[0]):
    setUp = FlujoLupTests.setUp

    def test_limpiar_demo_borra_solo_lo_de_muestra(self):
        from io import StringIO

        from django.core.management import call_command
        call_command('cargar_demo', '--forzar', stdout=StringIO())
        self.assertTrue(Usuario.objects.filter(email__endswith='@lup.demo').exists())
        call_command('limpiar_demo', '--si', stdout=StringIO())
        self.assertFalse(Usuario.objects.filter(email__endswith='@lup.demo').exists())
        self.assertFalse(Tienda.objects.filter(nombre_fantasia='Panadería El Sol').exists())
        # Lo real (creado en setUp) sigue
        self.assertTrue(Tienda.objects.filter(pk=self.tienda.pk).exists())
        self.assertTrue(Producto.objects.filter(pk=self.producto.pk).exists())
        out = StringIO()
        call_command('limpiar_demo', '--si', stdout=out)
        self.assertIn('ya está limpia', out.getvalue())

    def test_cargar_demo_no_corre_en_produccion(self):
        from django.core.management import CommandError, call_command
        from django.test import override_settings
        with override_settings(DEBUG=False), self.assertRaises(CommandError):
            call_command('cargar_demo')



# ==========================================================
# Búsqueda de comercios según la ubicación del cliente
# ==========================================================

class BusquedaCercanaTests(FlujoLupTests.__bases__[0]):
    """Alta Gracia (Medialunas, Panadería Sol) y Córdoba capital (Bananas, Verdulería Lejos): ~35 km."""

    AG = {'lat': '-31.6587', 'lng': '-64.4300'}
    crear_tienda_lejana = UbicacionTests.crear_tienda_lejana

    def setUp(self):
        FlujoLupTests.setUp(self)
        self.tienda.latitud, self.tienda.longitud = -31.6553, -64.4293
        self.tienda.save()
        self.crear_tienda_lejana()

    def test_catalogo_filtra_por_radio(self):
        r = self.client.get(reverse('catalogo'), self.AG)  # radio por defecto: 10 km
        self.assertContains(r, 'Medialunas')
        self.assertNotContains(r, 'Bananas')
        self.assertContains(r, 'Hay 1 más lejos')
        r = self.client.get(reverse('catalogo'), {**self.AG, 'radio': '25'})
        self.assertNotContains(r, 'Bananas')
        r = self.client.get(reverse('catalogo'), {**self.AG, 'radio': 'todos'})
        self.assertContains(r, 'Bananas')

    def test_sin_ubicacion_no_se_filtra(self):
        r = self.client.get(reverse('catalogo'))
        self.assertContains(r, 'Medialunas')
        self.assertContains(r, 'Bananas')

    def test_radio_sin_ofertas_cerca(self):
        r = self.client.get(reverse('catalogo'), {'lat': '-34.60', 'lng': '-58.38', 'radio': '5'})  # Buenos Aires
        self.assertContains(r, 'No hay ofertas a menos de 5 km')

    def test_pagina_de_comercios(self):
        r = self.client.get(reverse('lista_tiendas'))
        self.assertContains(r, 'Panadería Sol')
        self.assertContains(r, 'Verdulería Lejos')
        r = self.client.get(reverse('lista_tiendas'), self.AG)
        self.assertContains(r, 'Comercios cerca tuyo')
        self.assertContains(r, 'Panadería Sol')
        self.assertNotContains(r, 'Verdulería Lejos')
        r = self.client.get(reverse('lista_tiendas'), {**self.AG, 'radio': 'todos'})
        html = r.content.decode()
        self.assertLess(html.index('Panadería Sol'), html.index('Verdulería Lejos'))

    def test_home_cerca_devuelve_lo_cercano(self):
        datos = self.client.get(reverse('home_cerca'), self.AG).json()
        self.assertIn('Medialunas', datos['ofertas_html'])
        self.assertNotIn('Bananas', datos['ofertas_html'])
        self.assertIn('Panadería Sol', datos['comercios_html'])
        self.assertEqual(self.client.get(reverse('home_cerca')).status_code, 400)

    def test_home_pide_la_ubicacion(self):
        r = self.client.get(reverse('home'))
        self.assertContains(r, 'data-pedir-ubicacion')
        self.assertContains(r, 'data-home-cerca')

    def test_buscar_direccion_sin_clave(self):
        r = self.client.get(reverse('buscar_direccion'), {'q': 'Belgrano 120, Alta Gracia'})
        self.assertEqual(r.status_code, 404)

    @override_settings(GOOGLE_MAPS_API_KEY='CLAVE-TEST')
    def test_buscar_direccion_con_clave(self):
        with mock.patch('scr.bd_lup.products.views.geocodificar', return_value=(-31.65, -64.42)):
            r = self.client.get(reverse('buscar_direccion'), {'q': 'Belgrano 120, Alta Gracia'})
        self.assertEqual(r.json(), {'lat': -31.65, 'lng': -64.42})
        self.assertContains(self.client.get(reverse('home')), 'data-direccion-manual')
