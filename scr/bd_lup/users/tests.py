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
