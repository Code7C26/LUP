"""
Configuración de Django para el proyecto Lüp.

Documentación: https://docs.djangoproject.com/en/6.1/topics/settings/
"""

import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from django.core.exceptions import ImproperlyConfigured

# BASE_DIR apunta a la carpeta "scr/"
BASE_DIR = Path(__file__).resolve().parent.parent


def _cargar_env(ruta):
    """Lee el archivo .env de la raíz del proyecto (si existe) y carga sus variables.

    Formato: una variable por línea, CLAVE=valor. Las líneas con # se ignoran.
    Las variables que ya estén definidas en el sistema tienen prioridad.
    El .env está en .gitignore: las claves nunca se suben a GitHub.
    """
    if not ruta.exists():
        return
    for linea in ruta.read_text(encoding='utf-8').splitlines():
        linea = linea.strip()
        if not linea or linea.startswith('#') or '=' not in linea:
            continue
        clave, valor = linea.split('=', 1)
        os.environ.setdefault(clave.strip(), valor.strip().strip('"').strip("'"))


_cargar_env(BASE_DIR.parent / '.env')


def _lista(variable, por_defecto=''):
    """Variable de entorno con valores separados por comas → lista."""
    return [v.strip() for v in os.environ.get(variable, por_defecto).split(',') if v.strip()]


# ==========================================
# Desarrollo o producción
# ==========================================
# En la compu (sin variables) todo funciona como siempre: DEBUG activado y SQLite.
# Publicada (Render u otro hosting) se define DJANGO_DEBUG=0 y lo de "Publicar la página" en el README.
DEBUG = os.environ.get('DJANGO_DEBUG', '1') == '1'

_CLAVE_DESARROLLO = 'django-insecure-e!&2u4q_+m-9w$-ccqknc_4%ufg-n9@uq%as0rk!97dd1qvrti'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '').strip() or _CLAVE_DESARROLLO
if not DEBUG and SECRET_KEY == _CLAVE_DESARROLLO:
    raise ImproperlyConfigured('Falta DJANGO_SECRET_KEY: en producción la clave secreta tiene que ser propia.')

# Dominios desde los que se puede abrir la página (ej: lup.onrender.com,www.lupalimentos.com)
ALLOWED_HOSTS = _lista('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,[::1]')
# Render avisa la dirección del servicio (lup-xxxx.onrender.com): se agrega sola
RENDER_HOST = os.environ.get('RENDER_EXTERNAL_HOSTNAME', '').strip()
if RENDER_HOST and RENDER_HOST not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_HOST)

# Formularios enviados desde la dirección pública (https://...). Se arma con ALLOWED_HOSTS.
CSRF_TRUSTED_ORIGINS = _lista('DJANGO_CSRF_TRUSTED_ORIGINS') or [
    f'https://{h.lstrip(".")}' for h in ALLOWED_HOSTS
    if h not in ('localhost', '127.0.0.1', '[::1]', '*')
]


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    'rest_framework',
    'rest_framework.authtoken',

    # Apps de Lüp
    'scr.bd_lup.users.apps.UsersConfig',
    'scr.bd_lup.stores.apps.StoresConfig',
    'scr.bd_lup.products.apps.ProductsConfig',
    'scr.bd_lup.soporte.apps.SoporteConfig',
]

MIDDLEWARE = [
    'scr.lup.salud.SaludMiddleware',   # /salud/: el hosting chequea que la página esté viva
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'scr.lup.idioma.IdiomaMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Recordatorio "último día para retirar": publicada, se manda solo una vez por día desde esta hora
RECORDATORIOS_AUTOMATICOS = os.environ.get('RECORDATORIOS_AUTOMATICOS', '0' if DEBUG else '1') == '1'
RECORDATORIOS_HORA = int(os.environ.get('RECORDATORIOS_HORA', 9))
if RECORDATORIOS_AUTOMATICOS:
    MIDDLEWARE.append('scr.bd_lup.products.recordatorios.RecordatoriosMiddleware')

if not DEBUG:
    # Publicada: WhiteNoise sirve el CSS, JS y logos (en la compu lo hace runserver)
    MIDDLEWARE.insert(2, 'whitenoise.middleware.WhiteNoiseMiddleware')

ROOT_URLCONF = 'scr.lup.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.template.context_processors.i18n',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'scr.bd_lup.products.context_processors.google_maps',
                'scr.bd_lup.products.context_processors.opinion_pendiente',
                'scr.bd_lup.soporte.context_processors.soporte',
            ],
        },
    },
]

WSGI_APPLICATION = 'scr.lup.wsgi.application'


# Base de datos
# · En la compu: el archivo db.sqlite3 de la raíz del repositorio.
# · Publicada: PostgreSQL, con la dirección que da el hosting en DATABASE_URL
#   (postgresql://usuario:clave@servidor:puerto/base).
def _base_de_datos(url):
    partes = urlparse(url)
    if partes.scheme not in ('postgres', 'postgresql'):
        raise ImproperlyConfigured('DATABASE_URL tiene que ser una dirección postgresql://')
    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': unquote(partes.path.lstrip('/')),
        'USER': unquote(partes.username or ''),
        'PASSWORD': unquote(partes.password or ''),
        'HOST': partes.hostname or '',
        'PORT': str(partes.port or ''),
        'CONN_MAX_AGE': 60,
        'CONN_HEALTH_CHECKS': True,
    }


if os.environ.get('DATABASE_URL', '').strip():
    DATABASES = {'default': _base_de_datos(os.environ['DATABASE_URL'].strip())}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR.parent / 'db.sqlite3',
        }
    }

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Permite iniciar sesión con usuario o email
AUTHENTICATION_BACKENDS = [
    'scr.bd_lup.users.backends.UsuarioOEmailBackend',
]


# Internacionalización
LANGUAGE_CODE = 'es-ar'
# Idiomas de la web. Se cambian con el botón ES/EN de la barra (se guarda en una cookie).
LANGUAGES = [
    ('es-ar', 'Español'),
    ('en', 'English'),
]
LOCALE_PATHS = [BASE_DIR / 'locale']   # traducciones: scr/locale/en/LC_MESSAGES/django.po
LANGUAGE_COOKIE_AGE = 60 * 60 * 24 * 365
TIME_ZONE = 'America/Argentina/Cordoba'
USE_I18N = True
USE_TZ = True


# Archivos estáticos (CSS, JS, logos)
STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR.parent / 'staticfiles'   # "collectstatic" los junta acá al publicar

# Archivos subidos por los usuarios (fotos de productos, logos, fotos de perfil).
# En la compu quedan en LUP/media/ (está en .gitignore). Publicada, en un disco que no se borra
# con cada actualización: MEDIA_ROOT=/var/data/media en Render.
MEDIA_URL = '/media/'
MEDIA_ROOT = Path(os.environ.get('MEDIA_ROOT', '').strip() or BASE_DIR.parent / 'media')

STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    # Publicada: archivos comprimidos y con un código en el nombre, así el navegador nunca usa uno viejo
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage' if DEBUG
        else 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}


# Email · Avisos a los comercios por Gmail
# Si GMAIL_USUARIO y GMAIL_CLAVE_APP están en el .env, los emails salen de verdad por Gmail.
# Si no, se imprimen en la consola donde corre el servidor (útil para desarrollo).
GMAIL_USUARIO = os.environ.get('GMAIL_USUARIO', '').strip()
GMAIL_CLAVE_APP = os.environ.get('GMAIL_CLAVE_APP', '').replace(' ', '')

if GMAIL_USUARIO and GMAIL_CLAVE_APP:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = 'smtp.gmail.com'
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = GMAIL_USUARIO
    EMAIL_HOST_PASSWORD = GMAIL_CLAVE_APP
    EMAIL_TIMEOUT = 15
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = f'Lüp <{GMAIL_USUARIO or "avisos@lup.local"}>'

# Los emails se mandan en segundo plano para que la reserva no espere a Gmail
EMAIL_EN_SEGUNDO_PLANO = os.environ.get('EMAIL_EN_SEGUNDO_PLANO', '1') == '1'

# Notificaciones push al celular (servicio de Expo, ver users/push.py). PUSH_ACTIVADO=0 las apaga.
PUSH_ACTIVADO = os.environ.get('PUSH_ACTIVADO', '1') == '1'

# Dirección pública del sitio, para armar los links de los emails
SITIO_URL = (
    os.environ.get('SITIO_URL', '').strip()
    or os.environ.get('RENDER_EXTERNAL_URL', '').strip()
    or 'http://127.0.0.1:8000'
).rstrip('/')


# Google Maps (opcional)
# Con una clave se usa la API oficial para los mapas y para ubicar comercios por su dirección.
# Sin clave, los mapas y los links "Cómo llegar" funcionan igual con Google Maps básico.
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '').strip()


# Asistente de soporte con IA (soporte/asistente.py)
# Con ANTHROPIC_API_KEY responde Claude; sin clave, responde con preguntas frecuentes.
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '').strip()
SOPORTE_MODELO = os.environ.get('SOPORTE_MODELO', 'claude-haiku-5-5').strip()
# A dónde llegan los pedidos de "Hablar con una persona"
SOPORTE_EMAIL = os.environ.get('SOPORTE_EMAIL', '').strip() or GMAIL_USUARIO


# Modelo de usuario personalizado
AUTH_USER_MODEL = 'users.Usuario'

# Redirecciones de autenticación
LOGIN_URL = 'login'
LOGIN_REDIRECT_URL = 'panel'
LOGOUT_REDIRECT_URL = 'home'


# Bootstrap usa "danger" en lugar de "error"
from django.contrib.messages import constants as message_constants  # noqa: E402

MESSAGE_TAGS = {message_constants.ERROR: 'danger'}


# API REST (para la futura app móvil)
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticatedOrReadOnly'],
}


# ==========================================
# Seguridad de la página publicada (solo con DJANGO_DEBUG=0)
# ==========================================
if not DEBUG:
    # El hosting recibe el https y le pasa el pedido a Django: así Django sabe que fue seguro
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = os.environ.get('DJANGO_REDIRIGIR_HTTPS', '1') == '1'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    LANGUAGE_COOKIE_SECURE = True
    # Los navegadores recuerdan usar siempre https (1 mes; sin subdominios ni "preload",
    # para poder cambiar de dominio sin problemas después de la presentación)
    SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_HSTS_SEGUNDOS', 60 * 60 * 24 * 30))
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
    # Sin subdominios ni "preload" a propósito (ver arriba): se aceptan estos dos avisos de check --deploy
    SILENCED_SYSTEM_CHECKS = ['security.W005', 'security.W021']


# Errores y avisos en la consola (en Render se ven en la pestaña "Logs")
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'consola': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['consola'], 'level': 'WARNING'},
    'loggers': {
        'django': {'handlers': ['consola'], 'level': os.environ.get('DJANGO_LOG_LEVEL', 'WARNING'), 'propagate': False},
        # Robots que entran con direcciones ajenas: se rechazan (400) sin llenar los logs
        'django.security.DisallowedHost': {'handlers': [], 'propagate': False},
    },
}
