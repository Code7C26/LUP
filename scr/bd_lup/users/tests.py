from django.test import TestCase
from django.urls import reverse

from scr.bd_lup.stores.models import Tienda

from .models import Organizacion, Usuario

DATOS_BASE = {
    'first_name': 'Ana',
    'last_name': 'Pérez',
    'telefono': '3515551234',
    'ciudad': 'Alta Gracia',
    'password1': 'ClaveSegura#2026',
    'password2': 'ClaveSegura#2026',
    'acepta_terminos': 'on',
}


class RegistroTests(TestCase):
    def registrar(self, rol, **extra):
        datos = {**DATOS_BASE, 'username': f'user_{rol}', 'email': f'{rol}@lup.test', **extra}
        return self.client.post(reverse('registro', args=[rol]), datos)

    def test_paginas_publicas_cargan(self):
        for nombre, args in [('home', []), ('catalogo', []), ('login', []), ('registro_seleccion', []),
                             ('registro', ['consumidor']), ('registro', ['comercio']), ('registro', ['organizacion'])]:
            with self.subTest(nombre=nombre, args=args):
                self.assertEqual(self.client.get(reverse(nombre, args=args)).status_code, 200)

    def test_rol_inexistente_da_404(self):
        self.assertEqual(self.client.get(reverse('registro', args=['admin'])).status_code, 404)

    def test_registro_consumidor(self):
        respuesta = self.registrar('consumidor')
        self.assertRedirects(respuesta, reverse('panel'))
        usuario = Usuario.objects.get(username='user_consumidor')
        self.assertEqual(usuario.rol, Usuario.CONSUMIDOR)
        self.assertTrue(usuario.check_password('ClaveSegura#2026'))

    def test_registro_comercio_crea_tienda(self):
        respuesta = self.registrar(
            'comercio', nombre_fantasia='Panadería Lüp', rubro='panaderia', cuit='20123456789',
            direccion='Belgrano 100', horario_atencion='Lun a Sáb 18 a 20 hs',
        )
        self.assertRedirects(respuesta, reverse('panel'))
        tienda = Tienda.objects.get(usuario__username='user_comercio')
        self.assertEqual(tienda.cuit, '20-12345678-9')
        self.assertEqual(tienda.usuario.rol, Usuario.COMERCIO)

    def test_registro_organizacion_crea_perfil(self):
        respuesta = self.registrar(
            'organizacion', nombre_organizacion='Comedor Sonrisas', tipo='comedor',
            cuit='30-12345678-9', direccion='San Martín 50', personas_asistidas='80',
        )
        self.assertRedirects(respuesta, reverse('panel'))
        org = Organizacion.objects.get(usuario__username='user_organizacion')
        self.assertEqual(org.personas_asistidas, 80)

    def test_cuit_invalido(self):
        respuesta = self.registrar(
            'comercio', nombre_fantasia='X', rubro='otro', cuit='123', direccion='X', horario_atencion='X'
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertFalse(Usuario.objects.filter(username='user_comercio').exists())

    def test_email_duplicado(self):
        self.registrar('consumidor')
        self.client.logout()
        respuesta = self.registrar('consumidor', username='otro')
        self.assertContains(respuesta, 'Ya existe una cuenta con este email')

    def test_terminos_obligatorios(self):
        datos = {**DATOS_BASE, 'username': 'sin_terminos', 'email': 'x@lup.test'}
        datos.pop('acepta_terminos')
        self.client.post(reverse('registro', args=['consumidor']), datos)
        self.assertFalse(Usuario.objects.filter(username='sin_terminos').exists())


class LoginTests(TestCase):
    def setUp(self):
        self.usuario = Usuario.objects.create_user(
            'comercio1', 'comercio1@lup.test', 'ClaveSegura#2026', rol=Usuario.COMERCIO
        )

    def test_login_con_usuario(self):
        r = self.client.post(reverse('login'), {'username': 'comercio1', 'password': 'ClaveSegura#2026', 'rol': 'comercio'})
        self.assertRedirects(r, reverse('panel'))

    def test_login_con_email(self):
        r = self.client.post(reverse('login'), {'username': 'COMERCIO1@lup.test', 'password': 'ClaveSegura#2026', 'rol': 'comercio'})
        self.assertRedirects(r, reverse('panel'))

    def test_login_rol_incorrecto(self):
        r = self.client.post(reverse('login'), {'username': 'comercio1', 'password': 'ClaveSegura#2026', 'rol': 'consumidor'})
        self.assertContains(r, 'registrada como Comercio')
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_login_clave_incorrecta(self):
        r = self.client.post(reverse('login'), {'username': 'comercio1', 'password': 'mala', 'rol': 'comercio'})
        self.assertContains(r, 'incorrectos')

    def test_logout_por_post(self):
        self.client.force_login(self.usuario)
        r = self.client.post(reverse('logout'))
        self.assertRedirects(r, reverse('home'))
        self.assertNotIn('_auth_user_id', self.client.session)

    def test_perfil_requiere_login(self):
        r = self.client.get(reverse('perfil'))
        self.assertEqual(r.status_code, 302)

    def test_api_yo_devuelve_el_perfil_con_token(self):
        Tienda.objects.create(
            usuario=self.usuario, nombre_fantasia='Panadería Sol', rubro='panaderia',
            direccion='Belgrano 1', cuit='20-11111111-1', horario_atencion='18 a 20 hs',
        )
        self.assertEqual(self.client.get('/api/auth/yo/').status_code, 401)

        token = self.client.post(
            '/api/auth/login/', {'username': 'comercio1', 'password': 'ClaveSegura#2026'},
            content_type='application/json',
        ).json()['token']
        datos = self.client.get('/api/auth/yo/', HTTP_AUTHORIZATION=f'Token {token}').json()
        self.assertEqual(datos['email'], 'comercio1@lup.test')
        self.assertEqual(datos['comercio']['nombre'], 'Panadería Sol')
        self.assertNotIn('organizacion', datos)


def imagen_de_prueba(ancho=800, alto=600, formato='JPEG', nombre='foto.jpg'):
    from io import BytesIO

    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image

    buffer = BytesIO()
    Image.new('RGB', (ancho, alto), (113, 162, 77)).save(buffer, format=formato)
    tipo = 'image/png' if formato == 'PNG' else 'image/jpeg'
    return SimpleUploadedFile(nombre, buffer.getvalue(), content_type=tipo)


class FotoPerfilTests(TestCase):
    """Los tres tipos de cuenta pueden subir, cambiar y quitar su foto de perfil."""

    def setUp(self):
        import shutil
        import tempfile

        from django.test import override_settings

        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        ajustes = override_settings(MEDIA_ROOT=self.media)
        ajustes.enable()
        self.addCleanup(ajustes.disable)

        self.usuario = Usuario.objects.create_user(
            'cons1', 'cons1@lup.test', 'ClaveSegura#2026', rol=Usuario.CONSUMIDOR, first_name='Ana'
        )
        self.client.force_login(self.usuario)

    def enviar(self, **extra):
        datos = {'u-first_name': 'Ana', 'u-last_name': '', 'u-email': 'cons1@lup.test', 'u-telefono': '', 'u-ciudad': ''}
        datos.update(extra)
        return self.client.post(reverse('perfil'), datos)

    def test_subir_foto_la_recorta_en_cuadrado(self):
        from PIL import Image

        r = self.enviar(**{'u-foto': imagen_de_prueba(1200, 700)})
        self.assertRedirects(r, reverse('perfil'))
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.foto.name.startswith('perfiles/'))
        with Image.open(self.usuario.foto.path) as img:
            self.assertEqual(img.size, (400, 400))
        # Se muestra en la barra de navegación
        self.assertContains(self.client.get(reverse('panel')), self.usuario.foto.url)

    def test_cambiar_foto_borra_la_anterior(self):
        import os

        self.enviar(**{'u-foto': imagen_de_prueba()})
        self.usuario.refresh_from_db()
        vieja = self.usuario.foto.path
        self.enviar(**{'u-foto': imagen_de_prueba(formato='PNG', nombre='logo.png')})
        self.usuario.refresh_from_db()
        self.assertFalse(os.path.exists(vieja))
        self.assertTrue(self.usuario.foto.name.endswith('.jpg') or self.usuario.foto.name.endswith('.png'))

    def test_quitar_foto(self):
        import os

        self.enviar(**{'u-foto': imagen_de_prueba()})
        self.usuario.refresh_from_db()
        ruta = self.usuario.foto.path
        self.enviar(**{'u-quitar_foto': 'on'})
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.foto)
        self.assertFalse(os.path.exists(ruta))

    def test_archivo_que_no_es_imagen(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        r = self.enviar(**{'u-foto': SimpleUploadedFile('virus.jpg', b'no soy una imagen', content_type='image/jpeg')})
        self.assertEqual(r.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.foto)

    def test_comercio_y_organizacion_tambien_pueden(self):
        comercio = Usuario.objects.create_user('com1', 'com1@lup.test', 'ClaveSegura#2026', rol=Usuario.COMERCIO)
        tienda = Tienda.objects.create(
            usuario=comercio, nombre_fantasia='Panadería Sol', rubro='panaderia',
            cuit='20-12345678-9', direccion='San Martín 100', horario_atencion='18 a 20',
        )
        self.client.force_login(comercio)
        datos = {
            'u-first_name': '', 'u-last_name': '', 'u-email': 'com1@lup.test', 'u-telefono': '', 'u-ciudad': '',
            'p-nombre_fantasia': 'Panadería Sol', 'p-rubro': 'panaderia', 'p-descripcion': '',
            'p-direccion': 'San Martín 100', 'p-horario_atencion': '18 a 20',
            'u-foto': imagen_de_prueba(formato='PNG', nombre='logo.png'),
        }
        self.assertRedirects(self.client.post(reverse('perfil'), datos), reverse('perfil'))
        comercio.refresh_from_db()
        self.assertTrue(comercio.foto)
        # La foto aparece en el panel y en la página pública del comercio
        self.assertContains(self.client.get(reverse('panel')), comercio.foto.url)
        self.assertContains(self.client.get(reverse('detalle_tienda', args=[tienda.pk])), comercio.foto.url)

        org = Usuario.objects.create_user('org1', 'org1@lup.test', 'ClaveSegura#2026', rol=Usuario.ORGANIZACION)
        Organizacion.objects.create(usuario=org, nombre='Comedor Luz', cuit='30-12345678-9', direccion='Belgrano 50')
        self.client.force_login(org)
        datos = {
            'u-first_name': '', 'u-last_name': '', 'u-email': 'org1@lup.test', 'u-telefono': '', 'u-ciudad': '',
            'p-nombre': 'Comedor Luz', 'p-tipo': 'comedor', 'p-direccion': 'Belgrano 50',
            'p-personeria_juridica': '', 'p-personas_asistidas': '20',
            'u-foto': imagen_de_prueba(),
        }
        self.assertRedirects(self.client.post(reverse('perfil'), datos), reverse('perfil'))
        org.refresh_from_db()
        self.assertContains(self.client.get(reverse('panel')), org.foto.url)


class ModoOscuroTests(TestCase):
    def test_boton_de_tema_en_todas_las_paginas(self):
        r = self.client.get(reverse('home'))
        self.assertContains(r, 'data-cambiar-tema')
        self.assertContains(r, "localStorage.getItem('lup-tema')")

    def test_css_y_js_con_version_para_evitar_cache_viejo(self):
        r = self.client.get(reverse('home'))
        self.assertRegex(r.content.decode(), r'css/lup\.css\?v=\d+')
        self.assertRegex(r.content.decode(), r'js/lup\.js\?v=\d+')


class IdiomaTests(TestCase):
    """Botón ES/EN: la web cambia de idioma, la API de la app sigue en español."""

    def cambiar(self, idioma, siguiente='/productos/'):
        return self.client.post(reverse('set_language'), {'language': idioma, 'next': siguiente})

    def test_por_defecto_en_espanol_aunque_el_navegador_este_en_ingles(self):
        r = self.client.get(reverse('home'), HTTP_ACCEPT_LANGUAGE='en-US,en;q=0.9')
        self.assertContains(r, 'Ofertas cerca tuyo')
        self.assertContains(r, '<html lang="es"')
        self.assertContains(r, 'View in English')

    def test_cambiar_a_ingles_y_volver(self):
        r = self.cambiar('en')
        self.assertRedirects(r, '/productos/', fetch_redirect_response=False)
        r = self.client.get(reverse('catalogo'))
        self.assertContains(r, 'Offers to rescue today')
        self.assertContains(r, '<html lang="en"')
        self.assertContains(r, 'Ver en español')
        self.assertContains(r, 'js/lup-en.js')
        self.cambiar('es-ar')
        self.assertContains(self.client.get(reverse('catalogo')), 'Ofertas para rescatar hoy')

    def test_mensajes_formularios_y_opciones_en_ingles(self):
        self.cambiar('en')
        r = self.client.get(reverse('registro', args=['comercio']))
        self.assertContains(r, 'Store name')
        self.assertContains(r, 'Bakery / Pastry shop')
        r = self.client.post(reverse('login'), {'username': 'nadie', 'password': 'x', 'rol': 'consumidor'})
        self.assertContains(r, 'Incorrect username/email or password.')

    def test_la_api_siempre_responde_en_espanol(self):
        self.cambiar('en')
        r = self.client.post(reverse('api_login'), {'username': 'nadie', 'password': 'x'})
        self.assertEqual(r.json()['error'], 'Usuario/email o contraseña incorrectos.')
        self.assertEqual(r['Content-Language'], 'es-ar')

    def test_traducciones_compiladas_al_dia(self):
        """El .mo tiene que estar compilado desde el .po (python manage.py compilar_traducciones)."""
        import gettext
        from pathlib import Path

        from django.conf import settings

        from scr.bd_lup.products.management.commands.compilar_traducciones import leer_po
        carpeta = Path(settings.LOCALE_PATHS[0]) / 'en' / 'LC_MESSAGES'
        po = leer_po(carpeta / 'django.po')
        mo = gettext.GNUTranslations(open(carpeta / 'django.mo', 'rb'))
        for clave, valor in po.items():
            if clave and '\0' not in clave:
                self.assertEqual(mo.gettext(clave), valor, clave)


class EditarPerfilApiTests(TestCase):
    """PATCH /api/auth/yo/ desde la app: mismas validaciones que "Mis datos" de la web."""

    def setUp(self):
        import shutil
        import tempfile

        from django.test import override_settings
        from rest_framework.authtoken.models import Token
        from rest_framework.test import APIClient

        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        ajustes = override_settings(MEDIA_ROOT=self.media)
        ajustes.enable()
        self.addCleanup(ajustes.disable)

        self.usuario = Usuario.objects.create_user(
            'ana', 'ana@lup.test', 'ClaveSegura#2026', rol=Usuario.CONSUMIDOR,
            first_name='Ana', last_name='Pérez', telefono='351 111', ciudad='Córdoba',
        )
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.usuario).key}')

    def patch(self, datos, formato='json'):
        return self.api.patch('/api/auth/yo/', datos, format=formato)

    def test_sin_token(self):
        from rest_framework.test import APIClient
        self.assertEqual(APIClient().patch('/api/auth/yo/', {'ciudad': 'X'}, format='json').status_code, 401)

    def test_cambia_solo_lo_que_se_manda(self):
        r = self.patch({'first_name': 'Anita', 'telefono': '3547 620629'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['first_name'], 'Anita')
        self.assertEqual(r.json()['nombre'], 'Anita Pérez')
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.telefono, '3547 620629')
        self.assertEqual(self.usuario.last_name, 'Pérez')
        self.assertEqual(self.usuario.ciudad, 'Córdoba')

    def test_no_cambia_usuario_ni_rol(self):
        self.patch({'username': 'hacker', 'rol': 'comercio', 'is_staff': True})
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.username, 'ana')
        self.assertEqual(self.usuario.rol, Usuario.CONSUMIDOR)
        self.assertFalse(self.usuario.is_staff)

    def test_avisos_por_email(self):
        r = self.patch({'avisos_email': False})
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()['avisos_email'])
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.avisos_email)
        self.patch({'avisos_email': 'true'}, formato='multipart')
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.avisos_email)

    def test_cambiar_email_pide_la_clave_actual(self):
        r = self.patch({'email': 'nueva@lup.test'})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['clave_actual'], ['Para cambiar el email, escribí tu contraseña actual.'])
        r = self.patch({'email': 'nueva@lup.test', 'clave_actual': 'otra-cosa'})
        self.assertEqual(r.json()['clave_actual'], ['La contraseña actual no es correcta.'])
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.email, 'ana@lup.test')

        r = self.patch({'email': ' Nueva@LUP.test ', 'clave_actual': 'ClaveSegura#2026'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['email'], 'nueva@lup.test')
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.email, 'nueva@lup.test')

    def test_mismo_email_no_pide_clave(self):
        r = self.patch({'email': 'ANA@lup.test', 'ciudad': 'Alta Gracia'})
        self.assertEqual(r.status_code, 200)

    def test_email_de_otra_cuenta_o_invalido(self):
        Usuario.objects.create_user('beto', 'beto@lup.test', 'ClaveSegura#2026')
        r = self.patch({'email': 'BETO@lup.test', 'clave_actual': 'ClaveSegura#2026'})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['email'], ['Ya existe una cuenta con este email.'])
        r = self.patch({'email': 'no-es-un-email', 'clave_actual': 'ClaveSegura#2026'})
        self.assertIn('email', r.json())
        r = self.patch({'email': ''})
        self.assertIn('email', r.json())
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.email, 'ana@lup.test')

    def test_validaciones_del_formulario(self):
        r = self.patch({'telefono': '1' * 30})
        self.assertEqual(r.status_code, 400)
        self.assertIn('telefono', r.json())
        self.assertEqual(self.patch([1, 2]).status_code, 200)  # sin datos: no cambia nada

    def test_subir_cambiar_y_quitar_foto(self):
        import os

        from PIL import Image

        r = self.patch({'foto': imagen_de_prueba(1200, 700), 'ciudad': 'Alta Gracia'}, formato='multipart')
        self.assertEqual(r.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertEqual(r.json()['foto'], self.usuario.foto.url)
        self.assertEqual(self.usuario.ciudad, 'Alta Gracia')
        with Image.open(self.usuario.foto.path) as img:
            self.assertEqual(img.size, (400, 400))
        vieja = self.usuario.foto.path

        self.patch({'foto': imagen_de_prueba(formato='PNG', nombre='logo.png')}, formato='multipart')
        self.usuario.refresh_from_db()
        self.assertFalse(os.path.exists(vieja))
        actual = self.usuario.foto.path

        r = self.patch({'quitar_foto': 'true'}, formato='multipart')
        self.assertIsNone(r.json()['foto'])
        self.assertFalse(os.path.exists(actual))

    def test_foto_invalida_o_muy_pesada(self):
        from unittest import mock

        from django.core.files.uploadedfile import SimpleUploadedFile

        falsa = SimpleUploadedFile('virus.jpg', b'no soy una imagen', content_type='image/jpeg')
        r = self.patch({'foto': falsa}, formato='multipart')
        self.assertEqual(r.status_code, 400)
        self.assertIn('foto', r.json())
        with mock.patch('scr.bd_lup.users.forms.FOTO_TAMANO_MAX_MB', 0):
            r = self.patch({'foto': imagen_de_prueba()}, formato='multipart')
        self.assertEqual(r.status_code, 400)
        self.assertIn('MB', r.json()['foto'][0])
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.foto)


class RecuperarClaveTests(TestCase):
    """"¿Olvidaste tu contraseña?" en la web y en la app (POST /api/auth/recuperar/)."""

    def setUp(self):
        from django.core.cache import cache
        from django.test import override_settings

        cache.clear()  # el límite de pedidos por hora se guarda en la caché
        ajustes = override_settings(EMAIL_EN_SEGUNDO_PLANO=False, SITIO_URL='https://lup.test')
        ajustes.enable()
        self.addCleanup(ajustes.disable)
        self.usuario = Usuario.objects.create_user(
            'ana', 'ana@lup.test', 'ClaveVieja#2026', rol=Usuario.CONSUMIDOR, first_name='Ana', avisos_email=False,
        )

    def pedir(self, email):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(reverse('recuperar'), {'email': email})

    def pedir_api(self, datos):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(reverse('api_recuperar'), datos, content_type='application/json')

    def link_del_email(self):
        import re
        from django.core import mail
        return re.search(r'https://lup\.test\S+', mail.outbox[-1].body).group(0)

    def test_link_en_el_login(self):
        self.assertContains(self.client.get(reverse('login')), reverse('recuperar'))
        self.assertContains(self.client.get(reverse('recuperar')), '¿Olvidaste tu contraseña?')

    def test_web_manda_el_email_y_se_cambia_la_clave(self):
        from django.core import mail
        from rest_framework.authtoken.models import Token

        Token.objects.create(user=self.usuario)
        r = self.pedir('ANA@lup.test')
        self.assertRedirects(r, reverse('recuperar_enviado'))
        # Llega aunque tenga los avisos apagados, y sin los links para darse de baja
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ['ana@lup.test'])
        self.assertIn('contraseña', email.subject)
        self.assertIn('ana', email.body)
        html = email.alternatives[0][0]
        self.assertIn('Elegir contraseña nueva', html)
        self.assertNotIn('Dejar de recibir avisos', html)

        link = self.link_del_email()
        self.assertTrue(link.startswith('https://lup.test/usuarios/recuperar/'))
        r = self.client.get(link.replace('https://lup.test', ''), follow=True)
        self.assertContains(r, 'Elegí tu contraseña nueva')
        r = self.client.post(r.redirect_chain[-1][0], {'new_password1': 'ClaveNueva#2026', 'new_password2': 'ClaveNueva#2026'})
        self.assertRedirects(r, reverse('recuperar_listo'))

        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password('ClaveNueva#2026'))
        self.assertFalse(Token.objects.filter(user=self.usuario).exists())  # la app vuelve a pedir el login
        # El link no sirve dos veces
        r = self.client.get(link.replace('https://lup.test', ''), follow=True)
        self.assertContains(r, 'Este link ya no sirve')

    def test_clave_nueva_con_las_reglas_de_siempre(self):
        self.pedir('ana@lup.test')
        r = self.client.get(self.link_del_email().replace('https://lup.test', ''), follow=True)
        r = self.client.post(r.redirect_chain[-1][0], {'new_password1': '12345678', 'new_password2': '12345678'})
        self.assertEqual(r.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password('ClaveVieja#2026'))

    def test_email_sin_cuenta_o_cuenta_inactiva_no_manda_nada(self):
        from django.core import mail

        self.assertRedirects(self.pedir('nadie@lup.test'), reverse('recuperar_enviado'))
        self.usuario.is_active = False
        self.usuario.save()
        self.pedir('ana@lup.test')
        self.assertEqual(len(mail.outbox), 0)

    def test_limite_de_pedidos(self):
        from django.core import mail

        for _ in range(5):
            self.pedir('ana@lup.test')
        self.assertEqual(len(mail.outbox), 3)

    def test_link_invalido(self):
        r = self.client.get(reverse('recuperar_confirmar', args=['MQ', 'token-falso']), follow=True)
        self.assertContains(r, 'Este link ya no sirve')

    def test_api(self):
        from django.core import mail

        r = self.pedir_api({'email': 'ana@lup.test'})
        self.assertEqual(r.status_code, 200)
        self.assertIn('Spam', r.json()['mensaje'])
        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue(self.link_del_email().startswith('https://lup.test/usuarios/recuperar/'))
        # Misma respuesta si no hay cuenta (no se revela quién está registrado)
        r2 = self.pedir_api({'email': 'nadie@lup.test'})
        self.assertEqual(r2.json(), r.json())
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(self.pedir_api({'email': 'malo'}).status_code, 400)
        self.assertEqual(self.pedir_api([1]).status_code, 400)

    def test_en_ingles(self):
        self.client.post(reverse('set_language'), {'language': 'en', 'next': '/'})
        self.assertContains(self.client.get(reverse('login')), 'Forgot your password?')
        self.assertContains(self.client.get(reverse('recuperar')), 'Send me the link')


def cliente_api(usuario=None):
    """APIClient con el token de esa cuenta (o sin sesión)."""
    from rest_framework.authtoken.models import Token
    from rest_framework.test import APIClient

    api = APIClient()
    if usuario is not None:
        api.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.get_or_create(user=usuario)[0].key}')
    return api


class MiComercioApiTests(TestCase):
    """GET/PATCH /api/mi-comercio/: los datos del comercio con TiendaForm, igual que "Mis datos" de la web."""

    def setUp(self):
        from django.test import override_settings

        ajustes = override_settings(GOOGLE_MAPS_API_KEY='')  # sin pedidos reales a Google
        ajustes.enable()
        self.addCleanup(ajustes.disable)
        self.comercio = Usuario.objects.create_user('pan', 'pan@lup.test', 'ClaveSegura#2026', rol=Usuario.COMERCIO)
        self.tienda = Tienda.objects.create(
            usuario=self.comercio, nombre_fantasia='Panadería Sol', rubro='panaderia', descripcion='Pan casero',
            direccion='Belgrano 1', cuit='20-11111111-1', horario_atencion='18 a 20 hs',
        )
        self.api = cliente_api(self.comercio)
        self.url = reverse('api_mi_comercio')

    def patch(self, datos):
        return self.api.patch(self.url, datos, format='json')

    def test_get_trae_los_datos_y_los_rubros(self):
        datos = self.api.get(self.url).json()
        self.assertEqual(datos['nombre_fantasia'], 'Panadería Sol')
        self.assertEqual(datos['rubro'], 'panaderia')
        self.assertEqual(datos['cuit'], '20-11111111-1')
        self.assertIsNone(datos['latitud'])
        self.assertIn(['verduleria', 'Verdulería'], datos['rubros'])

    def test_cambia_solo_lo_que_se_manda(self):
        r = self.patch({'horario_atencion': 'Lun a Sáb de 19 a 21 hs', 'rubro': 'cafeteria'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['horario_atencion'], 'Lun a Sáb de 19 a 21 hs')
        self.tienda.refresh_from_db()
        self.assertEqual(self.tienda.rubro, 'cafeteria')
        self.assertEqual(self.tienda.nombre_fantasia, 'Panadería Sol')
        self.assertEqual(self.tienda.descripcion, 'Pan casero')

    def test_el_cuit_no_se_cambia(self):
        self.patch({'cuit': '20-99999999-9', 'usuario': 999})
        self.tienda.refresh_from_db()
        self.assertEqual(self.tienda.cuit, '20-11111111-1')
        self.assertEqual(self.tienda.usuario, self.comercio)

    def test_validaciones_del_formulario(self):
        r = self.patch({'nombre_fantasia': '', 'rubro': 'joyeria'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('nombre_fantasia', r.json())
        self.assertIn('rubro', r.json())
        r = self.patch({'latitud': -31.66})
        self.assertEqual(r.json()['non_field_errors'], ['La ubicación quedó incompleta. Volvé a marcarla.'])
        r = self.patch({'latitud': 120, 'longitud': -64.4})
        self.assertEqual(r.json()['non_field_errors'], ['La ubicación no es válida.'])
        self.tienda.refresh_from_db()
        self.assertEqual(self.tienda.nombre_fantasia, 'Panadería Sol')
        self.assertIsNone(self.tienda.latitud)

    def test_ubicacion_del_dispositivo(self):
        r = self.patch({'latitud': -31.6591, 'longitud': -64.4317})
        self.assertEqual(r.status_code, 200)
        self.tienda.refresh_from_db()
        self.assertAlmostEqual(self.tienda.latitud, -31.6591)
        self.assertTrue(self.tienda.tiene_ubicacion)

    def test_nueva_direccion_busca_la_ubicacion(self):
        from unittest import mock

        with mock.patch('scr.bd_lup.stores.ubicacion.geocodificar', return_value=(-31.65, -64.43)) as geo:
            r = self.patch({'direccion': 'España 50, Alta Gracia'})
        geo.assert_called_once_with('España 50, Alta Gracia')
        self.assertEqual(r.json()['latitud'], -31.65)

    def test_solo_el_comercio_dueno(self):
        consumidor = Usuario.objects.create_user('ana', 'ana@lup.test', 'ClaveSegura#2026')
        self.assertEqual(cliente_api(consumidor).patch(self.url, {'nombre_fantasia': 'X'}, format='json').status_code, 403)
        self.assertEqual(cliente_api().get(self.url).status_code, 401)
        # Otro comercio edita el suyo, nunca este
        otro = Usuario.objects.create_user('otro', 'otro@lup.test', 'ClaveSegura#2026', rol=Usuario.COMERCIO)
        Tienda.objects.create(usuario=otro, nombre_fantasia='Verdulería', rubro='verduleria',
                              direccion='Sarmiento 2', cuit='20-22222222-2', horario_atencion='9 a 12')
        r = cliente_api(otro).patch(self.url, {'nombre_fantasia': 'Cambiado'}, format='json')
        self.assertEqual(r.json()['nombre_fantasia'], 'Cambiado')
        self.tienda.refresh_from_db()
        self.assertEqual(self.tienda.nombre_fantasia, 'Panadería Sol')

    def test_comercio_sin_datos(self):
        nuevo = Usuario.objects.create_user('nuevo', 'nuevo@lup.test', 'ClaveSegura#2026', rol=Usuario.COMERCIO)
        self.assertEqual(cliente_api(nuevo).get(self.url).status_code, 404)


class MiOrganizacionApiTests(TestCase):
    """GET/PATCH /api/mi-organizacion/: los datos de la organización con OrganizacionForm."""

    def setUp(self):
        self.usuario = Usuario.objects.create_user('comedor', 'c@lup.test', 'ClaveSegura#2026', rol=Usuario.ORGANIZACION)
        self.org = Organizacion.objects.create(
            usuario=self.usuario, nombre='Comedor Luz', tipo='comedor', cuit='30-12345678-9',
            direccion='Belgrano 50', personas_asistidas=20,
        )
        self.api = cliente_api(self.usuario)
        self.url = reverse('api_mi_organizacion')

    def test_get_y_patch(self):
        datos = self.api.get(self.url).json()
        self.assertEqual(datos['nombre'], 'Comedor Luz')
        self.assertIn(['fundacion', 'Fundación'], datos['tipos'])
        r = self.api.patch(self.url, {'personas_asistidas': 45, 'personeria_juridica': 'RES 123/2020'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.org.refresh_from_db()
        self.assertEqual(self.org.personas_asistidas, 45)
        self.assertEqual(self.org.personeria_juridica, 'RES 123/2020')
        self.assertEqual(self.org.nombre, 'Comedor Luz')

    def test_validaciones(self):
        r = self.api.patch(self.url, {'tipo': 'club', 'personas_asistidas': -3, 'nombre': ''}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(set(r.json()), {'tipo', 'personas_asistidas', 'nombre'})
        self.api.patch(self.url, {'cuit': '30-99999999-9'}, format='json')
        self.org.refresh_from_db()
        self.assertEqual(self.org.cuit, '30-12345678-9')

    def test_solo_organizaciones(self):
        comercio = Usuario.objects.create_user('pan', 'pan@lup.test', 'ClaveSegura#2026', rol=Usuario.COMERCIO)
        self.assertEqual(cliente_api(comercio).get(self.url).status_code, 403)
        self.assertEqual(cliente_api().patch(self.url, {}, format='json').status_code, 401)


class CambiarClaveApiTests(TestCase):
    """POST /api/auth/cambiar-clave/ con la sesión abierta."""

    def setUp(self):
        self.usuario = Usuario.objects.create_user('ana', 'ana@lup.test', 'ClaveVieja#2026')
        self.api = cliente_api(self.usuario)
        self.url = reverse('api_cambiar_clave')

    def cambiar(self, **datos):
        return self.api.post(self.url, datos, format='json')

    def test_cambia_y_la_sesion_sigue_abierta(self):
        r = self.cambiar(clave_actual='ClaveVieja#2026', clave_nueva='ClaveNueva#2026')
        self.assertEqual(r.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password('ClaveNueva#2026'))
        self.assertEqual(self.api.get('/api/auth/yo/').status_code, 200)  # el mismo token sigue sirviendo
        # Y se puede ingresar con la nueva
        r = self.client.post('/api/auth/login/', {'username': 'ana', 'password': 'ClaveNueva#2026'},
                             content_type='application/json')
        self.assertEqual(r.status_code, 200)

    def test_con_la_sesion_de_la_web_tambien_sigue_abierta(self):
        self.client.force_login(self.usuario)
        r = self.client.post(self.url, {'clave_actual': 'ClaveVieja#2026', 'clave_nueva': 'ClaveNueva#2026'},
                             content_type='application/json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get('/api/auth/yo/').status_code, 200)
        self.assertEqual(self.client.get(reverse('perfil')).status_code, 200)

    def test_clave_actual_incorrecta(self):
        r = self.cambiar(clave_actual='otra', clave_nueva='ClaveNueva#2026')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json(), {'clave_actual': ['La contraseña actual no es correcta.']})
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password('ClaveVieja#2026'))

    def test_reglas_de_contrasena_de_django_en_castellano(self):
        r = self.cambiar(clave_actual='ClaveVieja#2026', clave_nueva='12345678')
        self.assertEqual(r.status_code, 400)
        mensajes = ' '.join(r.json()['clave_nueva']).lower()
        self.assertIn('contraseña', mensajes)
        self.assertIn('común', mensajes)
        r = self.cambiar(clave_actual='ClaveVieja#2026', clave_nueva='corta')
        self.assertIn('clave_nueva', r.json())

    def test_repetir_la_nueva(self):
        r = self.cambiar(clave_actual='ClaveVieja#2026', clave_nueva='ClaveNueva#2026', clave_nueva2='ClaveNueva#2027')
        self.assertEqual(r.status_code, 400)
        self.assertIn('clave_nueva2', r.json())

    def test_faltan_datos_o_sin_sesion(self):
        r = self.cambiar()
        self.assertEqual(set(r.json()), {'clave_actual', 'clave_nueva'})
        self.assertEqual(cliente_api().post(self.url, {}, format='json').status_code, 401)
