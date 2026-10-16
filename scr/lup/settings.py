"""
Configuración de Django para el proyecto Lüp.

Documentación: https://docs.djangoproject.com/en/6.1/topics/settings/
"""

import os
from pathlib import Path

# BASE_DIR apunta a la carpeta "scr/"
BASE_DIR = Path(__file__).resolve().parent.parent


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


# Email (en desarrollo se imprime en consola)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'


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
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticatedOrReadOnly'],
}
