"""Términos y Condiciones y Política de Privacidad (un texto por idioma)."""
from django.shortcuts import render
from django.utils import translation

ACTUALIZACION = '16/11/2026'


def _idioma():
    return 'en' if translation.get_language().startswith('en') else 'es'


def terminos(request):
    return render(request, f'legal/terminos_{_idioma()}.html', {'actualizacion': ACTUALIZACION})


def privacidad(request):
    return render(request, f'legal/privacidad_{_idioma()}.html', {'actualizacion': ACTUALIZACION})
