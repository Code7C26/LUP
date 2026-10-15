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
