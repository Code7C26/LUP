"""
Configuración de Django para el proyecto Lüp.

Documentación: https://docs.djangoproject.com/en/6.1/topics/settings/
"""

import os
from pathlib import Path

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


# SEGURIDAD: esta clave solo sirve para desarrollo. En producción definir
# DJANGO_SECRET_KEY, DJANGO_DEBUG=0 y DJANGO_ALLOWED_HOSTS como variables de entorno.
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-e!&2u4q_+m-9w$-ccqknc_4%ufg-n9@uq%as0rk!97dd1qvrti',
)
DEBUG = os.environ.get('DJANGO_DEBUG', '1') == '1'
ALLOWED_HOSTS = [h for h in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,[::1]').split(',') if h]


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    'rest_framework',

    # Apps de Lüp
    'scr.bd_lup.users.apps.UsersConfig',
    'scr.bd_lup.stores.apps.StoresConfig',
    'scr.bd_lup.products.apps.ProductsConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'scr.lup.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'scr.bd_lup.products.context_processors.google_maps',
            ],
        },
    },
]

WSGI_APPLICATION = 'scr.lup.wsgi.application'


# Base de datos (el archivo db.sqlite3 queda en la raíz del repositorio)
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
TIME_ZONE = 'America/Argentina/Cordoba'
USE_I18N = True
USE_TZ = True


# Archivos estáticos (CSS, JS, logos)
STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR.parent / 'staticfiles'

# Archivos subidos por los usuarios (fotos de productos).
# Quedan en LUP/media/, que está en .gitignore: no se suben al repositorio.
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR.parent / 'media'


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

# Dirección pública del sitio, para armar los links de los emails
SITIO_URL = os.environ.get('SITIO_URL', 'http://127.0.0.1:8000').rstrip('/')


# Google Maps (opcional)
# Con una clave se usa la API oficial para los mapas y para ubicar comercios por su dirección.
# Sin clave, los mapas y los links "Cómo llegar" funcionan igual con Google Maps básico.
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '').strip()


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
