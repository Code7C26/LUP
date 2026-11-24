from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils.timezone import localdate

from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.users.models import Usuario

from .models import Producto, Reserva


class CarritoTests(TestCase):
    def setUp(self):
        self.consumidor = Usuario.objects.create_user('cliente', 'c@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        tiendas = []
        for i, nombre in enumerate(('Panadería Sol', 'Verdulería Luna')):
            u = Usuario.objects.create_user(f'comercio{i}', f'{i}@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
            tiendas.append(Tienda.objects.create(
                usuario=u, nombre_fantasia=nombre, rubro='panaderia', direccion='Belgrano 1',
                cuit=f'20-1111111{i}-1', horario_atencion='18 a 20 hs',
            ))
        vence = localdate() + timedelta(days=1)
        self.medialunas = Producto.objects.create(
            comercio=tiendas[0], titulo='Medialunas', descripcion='Docena', categoria='panificados',
            precio_original=Decimal('3000'), precio_descuento=Decimal('1200'), stock=5, fecha_vencimiento=vence,
        )
        self.pan = Producto.objects.create(
            comercio=tiendas[0], titulo='Pan', descripcion='1 kg', categoria='panificados',
            precio_original=Decimal('2000'), precio_descuento=Decimal('1000'), stock=2, fecha_vencimiento=vence,
        )
        self.verduras = Producto.objects.create(
            comercio=tiendas[1], titulo='Verduras', descripcion='Bolsa', categoria='frutas_verduras',
            precio_original=Decimal('4000'), precio_descuento=Decimal('1500'), stock=3, fecha_vencimiento=vence,
        )
        self.client.force_login(self.consumidor)

    def agregar(self, producto, cantidad=1, **extra):
        return self.client.post(reverse('agregar_al_carrito', args=[producto.pk]), {'cantidad': cantidad, **extra})

    def carrito(self):
        return self.client.session.get('carrito', {})

    def test_agregar_suma_cantidades_y_respeta_el_stock(self):
        r = self.agregar(self.medialunas, 2)
        self.assertRedirects(r, reverse('detalle_producto', args=[self.medialunas.pk]))
        self.agregar(self.medialunas, 2)
        self.assertEqual(self.carrito(), {str(self.medialunas.pk): 4})
        self.agregar(self.medialunas, 3)  # pasaría el stock (5): queda en 5
        self.assertEqual(self.carrito()[str(self.medialunas.pk)], 5)
        # No descuenta stock hasta confirmar
        self.medialunas.refresh_from_db()
        self.assertEqual(self.medialunas.stock, 5)

    def test_pagina_del_carrito_agrupa_por_comercio_y_suma(self):
        self.agregar(self.medialunas, 2)
        self.agregar(self.verduras, 1)
        r = self.client.get(reverse('carrito'))
        self.assertContains(r, 'Panadería Sol')
        self.assertContains(r, 'Verdulería Luna')
        self.assertEqual(r.context['total'], Decimal('3900'))
        self.assertEqual(r.context['unidades'], 3)
        self.assertEqual(len(r.context['grupos']), 2)
        # El globito del menú muestra las unidades
        self.assertEqual(r.context['CARRITO_CANTIDAD'], 3)

    def test_confirmar_crea_una_reserva_por_producto(self):
        self.agregar(self.medialunas, 2)
        self.agregar(self.verduras, 3)
        r = self.client.post(reverse('confirmar_carrito'))
        self.assertRedirects(r, reverse('panel'))
        reservas = Reserva.objects.filter(consumidor=self.consumidor)
        self.assertEqual(reservas.count(), 2)
        self.assertEqual(len({x.codigo_retiro for x in reservas}), 2)
        self.assertEqual(reservas.get(producto=self.medialunas).precio_total, Decimal('2400'))
        self.medialunas.refresh_from_db()
        self.verduras.refresh_from_db()
        self.assertEqual(self.medialunas.stock, 3)
        self.assertEqual(self.verduras.stock, 0)
        self.assertEqual(self.verduras.estado, Producto.AGOTADO)
        self.assertEqual(self.carrito(), {})

    def test_si_algo_se_agoto_no_reserva_nada(self):
        self.agregar(self.medialunas, 1)
        self.agregar(self.pan, 2)
        Producto.objects.filter(pk=self.pan.pk).update(stock=1)  # otro cliente se llevó uno
        r = self.client.post(reverse('confirmar_carrito'), follow=True)
        self.assertRedirects(r, reverse('carrito'))
        self.assertFalse(Reserva.objects.exists())
        self.medialunas.refresh_from_db()
        self.assertEqual(self.medialunas.stock, 5)
        # Vuelve al carrito con el aviso, y la cantidad queda ajustada al stock
        self.assertContains(r, 'De Pan queda solo 1 unidad.')
        self.assertContains(r, 'Queda solo 1 unidad: ajustamos la cantidad.')
        self.assertEqual(self.carrito()[str(self.pan.pk)], 1)

    def test_producto_no_disponible_bloquea_confirmar(self):
        self.agregar(self.medialunas, 1)
        Producto.objects.filter(pk=self.medialunas.pk).update(estado=Producto.PAUSADO)
        r = self.client.get(reverse('carrito'))
        self.assertTrue(r.context['hay_no_disponibles'])
        self.assertContains(r, 'Ya no está disponible.')

    def test_actualizar_quitar_y_vaciar(self):
        self.agregar(self.medialunas, 1)
        self.agregar(self.verduras, 1)
        self.client.post(reverse('actualizar_carrito', args=[self.medialunas.pk]), {'cantidad': 4})
        self.assertEqual(self.carrito()[str(self.medialunas.pk)], 4)
        self.client.post(reverse('actualizar_carrito', args=[self.medialunas.pk]), {'cantidad': 99})
        self.assertEqual(self.carrito()[str(self.medialunas.pk)], 5)
        self.client.post(reverse('quitar_del_carrito', args=[self.verduras.pk]))
        self.assertNotIn(str(self.verduras.pk), self.carrito())
        self.client.post(reverse('vaciar_carrito'))
        self.assertEqual(self.carrito(), {})

    def test_carrito_vacio(self):
        r = self.client.get(reverse('carrito'))
        self.assertContains(r, 'Tu carrito está vacío')
        r = self.client.post(reverse('confirmar_carrito'))
        self.assertRedirects(r, reverse('catalogo'))

    def test_solo_consumidores(self):
        comercio = Usuario.objects.get(username='comercio0')
        self.client.force_login(comercio)
        self.assertRedirects(self.client.get(reverse('carrito')), reverse('catalogo'))
        self.agregar(self.medialunas, 1)
        self.assertEqual(self.carrito(), {})
        self.client.logout()
        r = self.client.get(reverse('carrito'))
        self.assertEqual(r.status_code, 302)
        self.assertIn('ingresar', r.url)

    def test_detalle_muestra_boton_y_lo_que_ya_hay(self):
        url = reverse('detalle_producto', args=[self.medialunas.pk])
        self.assertContains(self.client.get(url), 'Agregar al carrito')
        self.agregar(self.medialunas, 2)
        self.assertContains(self.client.get(url), 'Ya tenés 2 unidades en tu carrito.')

    def test_puntos_se_cuentan_por_reserva(self):
        self.agregar(self.medialunas, 1)  # $1.200 → 0 puntos
        self.agregar(self.verduras, 2)    # $3.000 → 1 punto
        r = self.client.get(reverse('carrito'))
        self.assertEqual(r.context['puntos'], 1)
