"""Completar con IA (products/ia_fotos.py): la API de la app, la vista de la web y el formulario.

La API de Anthropic nunca se llama de verdad: se simula urlopen (como en soporte/tests.py).
"""
import base64
import io
import json
from datetime import timedelta
from decimal import Decimal
from unittest import mock
from urllib.error import URLError

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.timezone import localdate
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.users.models import Usuario

from .models import Producto

URLOPEN = 'scr.bd_lup.soporte.asistente.urlopen'

SUGERENCIA = {
    'es_alimento': True,
    'titulo': 'Docena de medialunas de manteca',
    'categoria': 'panificados',
    'descripcion': 'Doce medialunas del día. Conservalas en un lugar seco.',
    'precio_sugerido': 4800,
    'dias_hasta_vencer': 1,
}


def respuesta_api(datos, stop_reason='end_turn'):
    """Lo que devolvería la API de Anthropic con structured outputs: el JSON va como texto."""
    texto = datos if isinstance(datos, str) else json.dumps(datos)
    cuerpo = io.BytesIO(json.dumps({
        'stop_reason': stop_reason,
        'content': [{'type': 'thinking', 'thinking': ''}, {'type': 'text', 'text': texto}],
    }).encode())
    cuerpo.__enter__ = lambda *a: cuerpo
    cuerpo.__exit__ = lambda *a: False
    return cuerpo


def foto(ancho=2000, alto=1500, nombre='medialunas.jpg'):
    from PIL import Image

    buffer = io.BytesIO()
    Image.new('RGB', (ancho, alto), (210, 160, 90)).save(buffer, format='JPEG')
    return SimpleUploadedFile(nombre, buffer.getvalue(), content_type='image/jpeg')


@override_settings(ANTHROPIC_API_KEY='clave-test', IA_FOTOS_MODELO='claude-haiku-5-5')
class SugerirProductoApiTests(TestCase):
    def setUp(self):
        cache.clear()  # el límite de usos por hora se guarda en la caché
        self.comercio = Usuario.objects.create_user('pan', 'pan@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        self.tienda = Tienda.objects.create(
            usuario=self.comercio, nombre_fantasia='Panadería Sol', rubro='panaderia',
            direccion='Belgrano 1', cuit='20-11111111-1', horario_atencion='18 a 20 hs',
        )
        Producto.objects.create(
            comercio=self.tienda, titulo='Pan de campo', descripcion='1 kg', categoria='panificados',
            precio_original=Decimal('3500'), precio_descuento=Decimal('1800'), stock=3,
            fecha_vencimiento=localdate(),
        )
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.comercio).key}')
        self.url = reverse('api_sugerir_producto')

    def enviar(self, archivo=None, cliente=None):
        datos = {'imagen': archivo} if archivo is not None else {}
        return (cliente or self.api).post(self.url, datos, format='multipart')

    def test_sugiere_los_datos_desde_la_foto(self):
        with mock.patch(URLOPEN, return_value=respuesta_api(SUGERENCIA)) as api:
            r = self.enviar(foto())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {
            'titulo': 'Docena de medialunas de manteca',
            'categoria': 'panificados',
            'descripcion': 'Doce medialunas del día. Conservalas en un lugar seco.',
            'precio_sugerido': 4800,
            'dias_hasta_vencer': 1,
            'fecha_vencimiento': (localdate() + timedelta(days=1)).isoformat(),
        })
        self.assertFalse(Producto.objects.filter(titulo__startswith='Docena').exists())  # no publica nada

        # Lo que se le mandó a la API
        pedido = api.call_args[0][0]
        self.assertEqual(pedido.full_url, 'https://api.anthropic.com/v1/messages')
        self.assertEqual(pedido.get_header('X-api-key'), 'clave-test')
        cuerpo = json.loads(pedido.data)
        self.assertEqual(cuerpo['model'], 'claude-haiku-5-5')
        formato = cuerpo['output_config']['format']
        self.assertEqual(formato['type'], 'json_schema')
        self.assertEqual(formato['schema']['properties']['categoria']['enum'],
                         [c for c, _ in Producto.CATEGORIAS])
        self.assertFalse(formato['schema']['additionalProperties'])
        imagen, texto = cuerpo['messages'][0]['content']
        self.assertEqual(imagen['source']['media_type'], 'image/jpeg')
        self.assertIn('Pan de campo: $3500', texto['text'])  # precios de referencia del comercio

        # La foto viaja achicada
        from PIL import Image
        with Image.open(io.BytesIO(base64.b64decode(imagen['source']['data']))) as img:
            self.assertLessEqual(max(img.size), 1024)

    def test_ajusta_valores_fuera_de_rango(self):
        raros = {**SUGERENCIA, 'categoria': 'joyeria', 'dias_hasta_vencer': 90, 'precio_sugerido': -5,
                 'titulo': 'x' * 300}
        with mock.patch(URLOPEN, return_value=respuesta_api(raros)):
            datos = self.enviar(foto()).json()
        self.assertEqual(datos['categoria'], 'otros')
        self.assertEqual(datos['dias_hasta_vencer'], 30)
        self.assertIsNone(datos['precio_sugerido'])
        self.assertEqual(len(datos['titulo']), 100)

    def test_foto_sin_comida(self):
        with mock.patch(URLOPEN, return_value=respuesta_api({**SUGERENCIA, 'es_alimento': False})):
            r = self.enviar(foto())
        self.assertEqual(r.status_code, 422)
        self.assertIn('No reconocimos comida', r.json()['error'])

    @override_settings(ANTHROPIC_API_KEY='')
    def test_sin_clave_error_claro(self):
        with mock.patch(URLOPEN) as api:
            r = self.enviar(foto())
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()['error'], '"Completar con IA" no está activado en Lüp. Completá los datos a mano.')
        api.assert_not_called()

    def test_si_la_api_falla(self):
        with mock.patch(URLOPEN, side_effect=URLError('sin red')), \
                self.assertLogs('scr.bd_lup.soporte.asistente', 'ERROR'):
            r = self.enviar(foto())
        self.assertEqual(r.status_code, 502)
        self.assertIn('No pudimos analizar la foto', r.json()['error'])

    def test_respuestas_que_no_sirven(self):
        casos = [respuesta_api('esto no es JSON'), respuesta_api(SUGERENCIA, stop_reason='refusal'),
                 respuesta_api('{"titulo": "Medial', stop_reason='max_tokens'), respuesta_api([1, 2])]
        for respuesta in casos:
            with mock.patch(URLOPEN, return_value=respuesta), self.assertLogs('scr.bd_lup.products', 'WARNING'):
                r = self.enviar(foto())
            self.assertEqual(r.status_code, 502)
            self.assertIn('No pudimos analizar la foto', r.json()['error'])

    def test_validaciones_de_la_foto(self):
        with mock.patch(URLOPEN) as api:
            self.assertEqual(self.enviar().json()['error'], 'Elegí o sacá una foto del producto.')
            r = self.enviar(SimpleUploadedFile('virus.jpg', b'no soy una imagen', content_type='image/jpeg'))
            self.assertEqual(r.status_code, 400)
            self.assertIn('no es una imagen', r.json()['error'])
            with mock.patch('scr.bd_lup.products.ia_fotos.TAMANO_MAX_MB', 0):
                r = self.enviar(foto())
            self.assertIn('MB', r.json()['error'])
        api.assert_not_called()

    def test_solo_comercios_con_token(self):
        consumidor = Usuario.objects.create_user('ana', 'ana@lup.test', 'Clave#2026')
        cliente = APIClient()
        cliente.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=consumidor).key}')
        with mock.patch(URLOPEN) as api:
            self.assertEqual(self.enviar(foto(), cliente).status_code, 403)
            self.assertEqual(self.enviar(foto(), APIClient()).status_code, 401)
            sesion = APIClient()
            sesion.force_login(self.comercio)  # la cookie de la web no sirve: solo token
            self.assertEqual(self.enviar(foto(), sesion).status_code, 401)
        api.assert_not_called()

    def test_limite_por_hora(self):
        with mock.patch('scr.bd_lup.products.ia_fotos.USOS_POR_HORA', 2):
            for _ in range(2):
                with mock.patch(URLOPEN, return_value=respuesta_api(SUGERENCIA)):
                    self.assertEqual(self.enviar(foto()).status_code, 200)
            with mock.patch(URLOPEN) as api:
                r = self.enviar(foto())
        self.assertEqual(r.status_code, 429)
        api.assert_not_called()


@override_settings(ANTHROPIC_API_KEY='clave-test')
class CompletarConIaWebTests(TestCase):
    def setUp(self):
        cache.clear()
        self.comercio = Usuario.objects.create_user('pan', 'pan@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        Tienda.objects.create(
            usuario=self.comercio, nombre_fantasia='Panadería Sol', rubro='panaderia',
            direccion='Belgrano 1', cuit='20-11111111-1', horario_atencion='18 a 20 hs',
        )
        self.url = reverse('sugerir_producto')

    def test_boton_en_el_formulario(self):
        self.client.force_login(self.comercio)
        r = self.client.get(reverse('publicar_excedente'))
        self.assertContains(r, 'Completar con IA')
        self.assertContains(r, f'data-url="{self.url}"')
        with self.settings(ANTHROPIC_API_KEY=''):
            self.assertNotContains(self.client.get(reverse('publicar_excedente')), 'data-ia-completar')

    def test_la_web_usa_la_misma_logica(self):
        self.client.force_login(self.comercio)
        with mock.patch(URLOPEN, return_value=respuesta_api(SUGERENCIA)):
            r = self.client.post(self.url, {'imagen': foto()})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['titulo'], 'Docena de medialunas de manteca')
        self.assertEqual(self.client.post(self.url).json()['error'], 'Elegí o sacá una foto del producto.')
        self.assertEqual(self.client.get(self.url).status_code, 405)

    def test_errores_en_ingles_en_la_web(self):
        self.client.force_login(self.comercio)
        self.client.post(reverse('set_language'), {'language': 'en', 'next': '/'})
        self.assertEqual(self.client.post(self.url).json()['error'], 'Choose or take a photo of the product.')

    def test_solo_comercios(self):
        consumidor = Usuario.objects.create_user('ana', 'ana@lup.test', 'Clave#2026')
        self.client.force_login(consumidor)
        with mock.patch(URLOPEN) as api:
            r = self.client.post(self.url, {'imagen': foto()})
        self.assertNotEqual(r.status_code, 200)
        api.assert_not_called()
