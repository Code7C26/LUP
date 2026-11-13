import io
import json
from datetime import timedelta
from decimal import Decimal
from unittest import mock
from urllib.error import URLError

from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.timezone import localdate
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from scr.bd_lup.products.models import Producto, Reserva
from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.users.models import Usuario

from . import asistente
from .models import Conversacion, Mensaje


def respuesta_api(texto):
    """Lo que devolvería la API de Anthropic (para simular urlopen)."""
    cuerpo = io.BytesIO(json.dumps({'content': [{'type': 'text', 'text': texto}]}).encode())
    cuerpo.__enter__ = lambda *a: cuerpo
    cuerpo.__exit__ = lambda *a: False
    return cuerpo


@override_settings(EMAIL_EN_SEGUNDO_PLANO=False, SOPORTE_EMAIL='equipo@lup.test', ANTHROPIC_API_KEY='')
class ChatSoporteTests(TestCase):
    def setUp(self):
        self.comercio = Usuario.objects.create_user('panaderia', 'p@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        self.tienda = Tienda.objects.create(
            usuario=self.comercio, nombre_fantasia='Panadería Sol', rubro='panaderia',
            direccion='Belgrano 1', cuit='20-11111111-1', horario_atencion='18 a 20 hs',
        )
        self.cliente = Usuario.objects.create_user('cliente', 'c@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        self.producto = Producto.objects.create(
            comercio=self.tienda, titulo='Medialunas', descripcion='Docena', categoria='panificados',
            precio_original=Decimal('3000'), precio_descuento=Decimal('1200'), stock=5,
            fecha_vencimiento=localdate() + timedelta(days=1),
        )

    def enviar(self, texto, **extra):
        return self.client.post(reverse('soporte_mensaje'), json.dumps({'texto': texto, **extra}),
                                content_type='application/json')

    # ---------- Sin IA: preguntas frecuentes ----------
    def test_sin_clave_responde_preguntas_frecuentes(self):
        r = self.enviar('¿Cómo CANCELO una reserva?', pagina='/panel/')
        self.assertEqual(r.status_code, 200)
        datos = r.json()
        self.assertFalse(datos['con_ia'])
        self.assertIn('Cancelar', datos['respuesta'])
        conv = Conversacion.objects.get(pk=datos['conversacion'])
        self.assertEqual(conv.pagina, '/panel/')
        self.assertEqual(list(conv.mensajes.values_list('rol', flat=True)), ['usuario', 'asistente'])

    def test_sugerencias_del_widget_tienen_respuesta(self):
        casos = {
            '¿Cómo confirmo un retiro?': 'Confirmar retiro',
            '¿Cómo marco algo como vendido?': 'vendida',
            '¿Cómo pido una donación?': 'Donables',
            '¿Dónde está mi código de retiro?': 'código de retiro',
            'No funciona la ubicación': 'Permitir',
            'Entré a un link y me salió que la página no existe.': 'vencido',
        }
        for pregunta, esperado in casos.items():
            self.assertIn(esperado, asistente.respuesta_frecuente(pregunta), pregunta)

    def test_sin_respuesta_sugiere_persona(self):
        r = self.enviar('xyz qwerty')
        self.assertIn('Hablar con una persona', r.json()['respuesta'])

    def test_en_ingles(self):
        self.client.cookies['django_language'] = 'en'
        r = self.enviar('my emails never arrive')
        self.assertIn('Spam', r.json()['respuesta'])
        self.assertIn('My details', r.json()['respuesta'])

    def test_mensaje_vacio_y_largo(self):
        self.assertEqual(self.enviar('   ').status_code, 400)
        r = self.enviar('a' * 5000)
        self.assertEqual(Mensaje.objects.filter(rol='usuario').get().texto, 'a' * 800)
        self.assertEqual(r.status_code, 200)

    def test_solo_post(self):
        self.assertEqual(self.client.get(reverse('soporte_mensaje')).status_code, 405)

    def test_limite_de_mensajes(self):
        conv = None
        for _ in range(30):
            conv = self.enviar('hola', conversacion=conv).json()['conversacion']
        r = self.enviar('hola', conversacion=conv)
        self.assertEqual(r.status_code, 429)

    def test_no_se_puede_seguir_la_charla_de_otro(self):
        self.client.force_login(self.cliente)
        conv = self.enviar('hola').json()['conversacion']
        self.client.logout()
        r = self.enviar('hola', conversacion=conv)
        self.assertNotEqual(r.json()['conversacion'], conv)
        self.assertEqual(Conversacion.objects.get(pk=conv).mensajes.count(), 2)

    # ---------- Con IA ----------
    @override_settings(ANTHROPIC_API_KEY='clave-test', SOPORTE_MODELO='claude-haiku-5-5')
    def test_con_ia_manda_historial_y_contexto(self):
        reserva = Reserva.objects.create(producto=self.producto, consumidor=self.cliente, cantidad=2,
                                         precio_total=Decimal('2400'))
        self.client.force_login(self.cliente)
        with mock.patch('scr.bd_lup.soporte.asistente.urlopen', return_value=respuesta_api('Primera')) as api:
            conv = self.enviar('hola').json()['conversacion']
        with mock.patch('scr.bd_lup.soporte.asistente.urlopen', return_value=respuesta_api('Tu código está en **Mi panel**.')) as api:
            datos = self.enviar('¿dónde está mi código?', conversacion=conv).json()
        self.assertTrue(datos['con_ia'])
        self.assertEqual(datos['respuesta'], 'Tu código está en **Mi panel**.')

        pedido = api.call_args[0][0]
        self.assertEqual(pedido.full_url, 'https://api.anthropic.com/v1/messages')
        self.assertEqual(pedido.get_header('X-api-key'), 'clave-test')
        self.assertEqual(pedido.get_header('Anthropic-version'), '2023-06-01')
        cuerpo = json.loads(pedido.data)
        self.assertEqual(cuerpo['model'], 'claude-haiku-5-5')
        self.assertEqual([m['role'] for m in cuerpo['messages']], ['user', 'assistant', 'user'])
        contexto = cuerpo['system'][1]['text']
        self.assertIn(reserva.codigo_retiro, contexto)
        self.assertIn('Panadería Sol', contexto)
        self.assertNotIn('p@lup.test', json.dumps(cuerpo))  # nada de datos de otras personas

    @override_settings(ANTHROPIC_API_KEY='clave-test')
    def test_si_la_ia_falla_responde_igual(self):
        with mock.patch('scr.bd_lup.soporte.asistente.urlopen', side_effect=URLError('sin red')), \
                self.assertLogs('scr.bd_lup.soporte.asistente', 'ERROR'):
            datos = self.enviar('no me llega el mail').json()
        self.assertFalse(datos['con_ia'])
        self.assertIn('Spam', datos['respuesta'])

    def test_contexto_comercio(self):
        texto = asistente.contexto_usuario(self.comercio, '/panel/')
        self.assertIn('Ofertas activas: 1', texto)
        self.assertIn('Ubicación del local cargada: no', texto)

    # ---------- Hablar con una persona ----------
    def test_derivar_visitante_pide_email(self):
        conv = self.enviar('olvidé mi contraseña').json()['conversacion']
        url = reverse('soporte_derivar')
        r = self.client.post(url, json.dumps({'conversacion': conv}), content_type='application/json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post(url, json.dumps({'conversacion': conv, 'email': 'malo'}), content_type='application/json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post(url, json.dumps({'conversacion': conv, 'email': 'yo@mail.test', 'detalle': 'Mi usuario es juan'}),
                             content_type='application/json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('yo@mail.test', r.json()['respuesta'])
        conv = Conversacion.objects.get(pk=conv)
        self.assertTrue(conv.derivada)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ['equipo@lup.test'])
        self.assertEqual(email.reply_to, ['yo@mail.test'])
        self.assertIn('olvidé mi contraseña', email.body)
        self.assertIn('Mi usuario es juan', email.body)

    def test_derivar_usuario_usa_su_email(self):
        self.client.force_login(self.cliente)
        r = self.client.post(reverse('soporte_derivar'), json.dumps({}), content_type='application/json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(mail.outbox[0].reply_to, ['c@lup.test'])
        self.assertIn('cliente', mail.outbox[0].body)

    # ---------- Widget ----------
    def test_widget_en_las_paginas(self):
        r = self.client.get(reverse('home'))
        self.assertContains(r, 'data-chat')
        self.assertContains(r, 'Respuestas automáticas')
        with self.settings(ANTHROPIC_API_KEY='x'):
            r = self.client.get(reverse('home'))
        self.assertContains(r, 'Asistente con IA')
        self.client.force_login(self.comercio)
        r = self.client.get(reverse('home'))
        self.assertContains(r, '¿Cómo confirmo un retiro?')


@override_settings(EMAIL_EN_SEGUNDO_PLANO=False, SOPORTE_EMAIL='equipo@lup.test', ANTHROPIC_API_KEY='')
class ApiSoporteTests(TestCase):
    """El chat desde la app: /api/soporte/... con token (o como invitado), misma lógica y límites que la web."""

    def setUp(self):
        self.cliente = Usuario.objects.create_user('cliente', 'c@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        self.otro = Usuario.objects.create_user('otro', 'o@lup.test', 'Clave#2026', rol=Usuario.CONSUMIDOR)
        self.api = APIClient()
        self.url = reverse('api_soporte_mensaje')
        self.url_persona = reverse('api_soporte_persona')

    def con_token(self, usuario=None):
        token, _ = Token.objects.get_or_create(user=usuario or self.cliente)
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def enviar(self, texto, **extra):
        return self.api.post(self.url, {'texto': texto, **extra}, format='json')

    def derivar(self, **datos):
        return self.api.post(self.url_persona, datos, format='json')

    # ---------- Invitado ----------
    def test_invitado_recibe_clave_y_sigue_su_charla(self):
        r = self.enviar('¿Cómo cancelo una reserva?', pagina='Inicio')
        self.assertEqual(r.status_code, 200)
        datos = r.json()
        self.assertFalse(datos['con_ia'])
        self.assertIn('Cancelar', datos['respuesta'])
        clave = datos['invitado']
        self.assertTrue(clave.startswith('app-'))
        conv = Conversacion.objects.get(pk=datos['conversacion'])
        self.assertIsNone(conv.usuario)
        self.assertEqual(conv.sesion, clave)
        self.assertEqual(conv.pagina, 'app:Inicio')

        r = self.enviar('gracias', conversacion=conv.pk, invitado=clave)
        self.assertEqual(r.json()['conversacion'], conv.pk)
        self.assertEqual(r.json()['invitado'], clave)
        self.assertEqual(conv.mensajes.count(), 4)

    def test_invitado_no_sigue_la_charla_de_otro(self):
        datos = self.enviar('hola').json()
        for clave in (None, 'app-' + 'x' * 30, 'una-clave-cualquiera-de-navegador'):
            extra = {'invitado': clave} if clave else {}
            r = self.enviar('hola', conversacion=datos['conversacion'], **extra)
            self.assertNotEqual(r.json()['conversacion'], datos['conversacion'])
            self.assertNotEqual(r.json()['invitado'], datos['invitado'])
        self.assertEqual(Conversacion.objects.get(pk=datos['conversacion']).mensajes.count(), 2)

    def test_invitado_no_sigue_una_charla_de_la_web(self):
        conv_web = self.client.post(reverse('soporte_mensaje'), json.dumps({'texto': 'hola'}),
                                    content_type='application/json').json()['conversacion']
        clave_web = Conversacion.objects.get(pk=conv_web).sesion
        r = self.enviar('hola', conversacion=conv_web, invitado=clave_web)
        self.assertNotEqual(r.json()['conversacion'], conv_web)

    def test_limite_de_mensajes_invitado(self):
        clave = conv = None
        for _ in range(30):
            datos = self.enviar('hola', conversacion=conv, **({'invitado': clave} if clave else {})).json()
            clave, conv = datos['invitado'], datos['conversacion']
        r = self.enviar('hola', conversacion=conv, invitado=clave)
        self.assertEqual(r.status_code, 429)
        self.assertIn('WhatsApp', r.json()['error'])
        # "Hablar con una persona" sigue andando en la charla que ya existe
        r = self.derivar(conversacion=conv, invitado=clave, email='yo@mail.test')
        self.assertEqual(r.status_code, 200)

    # ---------- Con token ----------
    def test_con_token_la_charla_es_de_la_cuenta(self):
        self.con_token()
        r = self.enviar('no me llegan los mails', pagina='Perfil')
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('invitado', r.json())
        self.assertIn('Spam', r.json()['respuesta'])
        conv = Conversacion.objects.get(pk=r.json()['conversacion'])
        self.assertEqual(conv.usuario, self.cliente)
        self.assertEqual(conv.sesion, '')

    def test_con_token_no_sigue_la_charla_de_otra_cuenta_ni_de_un_invitado(self):
        self.con_token(self.otro)
        conv = self.enviar('hola').json()['conversacion']
        self.con_token()
        self.assertNotEqual(self.enviar('hola', conversacion=conv).json()['conversacion'], conv)

        self.api.credentials()
        datos = self.enviar('hola').json()
        self.con_token()
        r = self.enviar('hola', conversacion=datos['conversacion'], invitado=datos['invitado'])
        self.assertNotEqual(r.json()['conversacion'], datos['conversacion'])

    def test_token_invalido(self):
        self.api.credentials(HTTP_AUTHORIZATION='Token no-existe')
        self.assertEqual(self.enviar('hola').status_code, 401)

    def test_la_sesion_de_la_web_no_cuenta(self):
        self.api.force_login(self.cliente)  # cookie de sesión, sin token: se la trata como invitado
        r = self.enviar('hola')
        self.assertEqual(r.status_code, 200)
        self.assertIn('invitado', r.json())
        self.assertIsNone(Conversacion.objects.get(pk=r.json()['conversacion']).usuario)

    def test_limite_compartido_con_la_web(self):
        self.client.force_login(self.cliente)
        for _ in range(30):
            self.client.post(reverse('soporte_mensaje'), json.dumps({'texto': 'hola'}), content_type='application/json')
        self.con_token()
        self.assertEqual(self.enviar('hola').status_code, 429)

    def test_validaciones(self):
        self.con_token()
        self.assertEqual(self.enviar('   ').status_code, 400)
        self.assertEqual(self.api.post(self.url, [1, 2], format='json').status_code, 400)
        self.assertEqual(self.api.get(self.url).status_code, 405)
        r = self.enviar('a' * 5000, conversacion='abc')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Mensaje.objects.filter(rol='usuario').get().texto, 'a' * 800)

    def test_la_api_responde_en_espanol(self):
        # Como el resto de /api/ (lup/idioma.py): la app está en español aunque la web esté en inglés
        self.api.cookies['django_language'] = 'en'
        r = self.enviar('my emails never arrive')
        self.assertIn('Mis datos', r.json()['respuesta'])

    @override_settings(ANTHROPIC_API_KEY='clave-test')
    def test_con_ia_sabe_que_es_la_app(self):
        comercio = Usuario.objects.create_user('pan', 'p@lup.test', 'Clave#2026', rol=Usuario.COMERCIO)
        tienda = Tienda.objects.create(
            usuario=comercio, nombre_fantasia='Panadería Sol', rubro='panaderia', direccion='Belgrano 1',
            cuit='20-11111111-1', horario_atencion='18 a 20 hs',
        )
        producto = Producto.objects.create(
            comercio=tienda, titulo='Medialunas', descripcion='Docena', categoria='panificados',
            precio_original=Decimal('3000'), precio_descuento=Decimal('1200'), stock=5,
            fecha_vencimiento=localdate() + timedelta(days=1),
        )
        reserva = Reserva.objects.create(producto=producto, consumidor=self.cliente, cantidad=1,
                                         precio_total=Decimal('1200'))
        self.con_token()
        with mock.patch('scr.bd_lup.soporte.asistente.urlopen', return_value=respuesta_api('Está en **Reservas**.')) as api:
            datos = self.enviar('¿dónde está mi código?', pagina='Inicio').json()
        self.assertTrue(datos['con_ia'])
        self.assertEqual(datos['respuesta'], 'Está en **Reservas**.')
        contexto = json.loads(api.call_args[0][0].data)['system'][1]['text']
        self.assertIn('APP del celular', contexto)
        self.assertIn('Pantalla de la app desde la que abrió la ayuda: Inicio', contexto)
        self.assertIn(reserva.codigo_retiro, contexto)

    # ---------- Hablar con una persona ----------
    def test_persona_invitado_pide_email(self):
        datos = self.enviar('olvidé mi contraseña').json()
        base = {'conversacion': datos['conversacion'], 'invitado': datos['invitado']}
        self.assertEqual(self.derivar(**base).status_code, 400)
        self.assertEqual(self.derivar(**base, email='malo').status_code, 400)
        r = self.derivar(**base, email='yo@mail.test', detalle='Mi usuario es juan')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['conversacion'], datos['conversacion'])
        self.assertIn('yo@mail.test', r.json()['respuesta'])
        self.assertTrue(Conversacion.objects.get(pk=datos['conversacion']).derivada)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.reply_to, ['yo@mail.test'])
        self.assertIn('olvidé mi contraseña', email.body)
        self.assertIn('Mi usuario es juan', email.body)
        self.assertIn('Página: app:', email.body)

    def test_persona_con_token_usa_su_email(self):
        self.con_token()
        r = self.derivar(pagina='Perfil')
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('invitado', r.json())
        self.assertEqual(mail.outbox[0].reply_to, ['c@lup.test'])
        self.assertIn('Usuario: cliente', mail.outbox[0].body)
        self.assertIn('Página: app:Perfil', mail.outbox[0].body)
