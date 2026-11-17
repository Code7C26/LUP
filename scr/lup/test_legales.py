from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils.timezone import localdate

from scr.bd_lup.products.models import Producto
from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.users.models import Usuario


class PaginasLegalesTests(TestCase):
    def test_terminos_y_privacidad_en_los_dos_idiomas(self):
        self.assertContains(self.client.get(reverse('terminos')), 'Lüp no vende ni compra alimentos.')
        self.assertContains(self.client.get(reverse('privacidad')), 'Ley 25.326')
        self.client.cookies['django_language'] = 'en'
        self.assertContains(self.client.get(reverse('terminos')), 'Lüp does not sell or buy food.')
        self.assertContains(self.client.get(reverse('privacidad')), 'Your location is optional.')

    def test_registro_y_pie_enlazan(self):
        r = self.client.get(reverse('registro', args=['consumidor']))
        self.assertContains(r, reverse('terminos'))
        self.assertContains(r, reverse('privacidad'))

    def test_publicar_exige_declarar_que_es_apto(self):
        comercio = Usuario.objects.create_user('pan', 'p@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        Tienda.objects.create(usuario=comercio, nombre_fantasia='Pan', rubro='panaderia', direccion='Belgrano 1',
                              cuit='20-11111111-1', horario_atencion='9 a 20')
        self.client.force_login(comercio)
        datos = {'titulo': 'Pan', 'categoria': 'panificados', 'descripcion': 'x', 'precio_original': '1000',
                 'precio_descuento': '500', 'stock': '2', 'fecha_vencimiento': (localdate() + timedelta(days=1)).isoformat()}
        r = self.client.post(reverse('publicar_excedente'), datos)
        self.assertContains(r, 'Para publicar tenés que confirmar que el producto es apto y no está vencido.')
        self.assertFalse(Producto.objects.exists())
        self.client.post(reverse('publicar_excedente'), {**datos, 'declara_apto': 'on'})
        self.assertTrue(Producto.objects.exists())
