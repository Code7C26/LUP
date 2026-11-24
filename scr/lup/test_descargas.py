import hashlib
from pathlib import Path

from django.test import TestCase, override_settings
from django.urls import reverse


class DescargaAppTests(TestCase):
    def test_baja_el_apk_entero(self):
        from django.conf import settings
        partes = sorted(Path(settings.DESCARGAS_DIR).glob('lup-android.apk.[0-9][0-9][0-9]'))
        self.assertTrue(partes, 'Faltan las partes del APK en scr/descargas/')
        r = self.client.get(reverse('descargar_app'))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'application/vnd.android.package-archive')
        self.assertIn('Lup.apk', r['Content-Disposition'])
        cuerpo = b''.join(r.streaming_content)
        self.assertEqual(len(cuerpo), int(r['Content-Length']))
        self.assertTrue(cuerpo.startswith(b'PK'))  # un APK es un zip
        esperado = hashlib.sha256(b''.join(p.read_bytes() for p in partes)).hexdigest()
        self.assertEqual(hashlib.sha256(cuerpo).hexdigest(), esperado)

    @override_settings(APP_ANDROID_URL='https://example.com/lup.apk')
    def test_enlace_externo(self):
        r = self.client.get(reverse('descargar_app'))
        self.assertRedirects(r, 'https://example.com/lup.apk', fetch_redirect_response=False)

    def test_boton_en_inicio_y_pie(self):
        r = self.client.get(reverse('home'))
        self.assertContains(r, reverse('descargar_app'), count=2)
        self.assertContains(r, 'Descargar la app')
        self.assertContains(r, 'Lüp para Android')
