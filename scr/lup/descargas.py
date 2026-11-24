"""Descarga de la app de Lüp para Android (APK) desde la página web.

El APK pesa más de lo que GitHub acepta en un solo archivo (100 MB), así que está guardado en partes
en scr/descargas/ (lup-android.apk.000, .001, …) y esta vista las manda juntas, como un solo archivo.

Para publicar una versión nueva de la app, reemplazá las partes:
    split -b 60m -d -a 3 Lup.apk scr/descargas/lup-android.apk.

Si algún día el APK se sube a otro lado (Play Store, GitHub Releases, Drive), alcanza con poner el
enlace en la variable de entorno APP_ANDROID_URL: el botón lleva directo ahí.
"""
from django.conf import settings
from django.http import Http404, StreamingHttpResponse
from django.shortcuts import redirect

TROZO = 1024 * 1024  # 1 MB por lectura


def partes_apk():
    return sorted(settings.DESCARGAS_DIR.glob('lup-android.apk.[0-9][0-9][0-9]'))


def _leer(partes):
    for parte in partes:
        with open(parte, 'rb') as archivo:
            while datos := archivo.read(TROZO):
                yield datos


def app_android(request):
    if settings.APP_ANDROID_URL:
        return redirect(settings.APP_ANDROID_URL)
    partes = partes_apk()
    if not partes:
        raise Http404('La app todavía no está disponible para descargar.')
    respuesta = StreamingHttpResponse(_leer(partes), content_type='application/vnd.android.package-archive')
    respuesta['Content-Length'] = str(sum(p.stat().st_size for p in partes))
    respuesta['Content-Disposition'] = 'attachment; filename="Lup.apk"'
    respuesta['Cache-Control'] = 'public, max-age=3600'
    return respuesta
