import os

from django import template
from django.contrib.staticfiles import finders
from django.templatetags.static import static

register = template.Library()

EMOJIS_CATEGORIA = {
    'panificados': '🥐',
    'comidas': '🍲',
    'frutas_verduras': '🥕',
    'lacteos': '🧀',
    'carnes': '🍗',
    'almacen': '🥫',
    'bolsa_sorpresa': '🛍️',
    'otros': '🍽️',
}


@register.filter
def emoji_categoria(categoria):
    return EMOJIS_CATEGORIA.get(categoria, '🍽️')


@register.filter
def con_error(campo):
    """Renderiza el widget agregando la clase is-invalid si el campo tiene errores."""
    if campo.errors:
        clases = campo.field.widget.attrs.get('class', '')
        return campo.as_widget(attrs={'class': f'{clases} is-invalid'.strip()})
    return campo


@register.filter
def iniciales(usuario):
    texto = usuario.nombre_visible if hasattr(usuario, 'nombre_visible') else str(usuario)
    partes = [p for p in texto.split() if p]
    return ''.join(p[0] for p in partes[:2]).upper() or '?'


@register.simple_tag(takes_context=True)
def url_con(context, **kwargs):
    """Devuelve la query string actual reemplazando los parámetros indicados."""
    params = context['request'].GET.copy()
    for clave, valor in kwargs.items():
        if valor in (None, ''):
            params.pop(clave, None)
        else:
            params[clave] = valor
    return '?' + params.urlencode() if params else '?'


@register.simple_tag
def static_v(ruta):
    """Como {% static %}, pero agrega ?v=<fecha de modificación del archivo>.

    Así, cada vez que cambia lup.css o lup.js el navegador descarga la versión
    nueva en lugar de usar la copia vieja que tenía guardada en caché.
    """
    url = static(ruta)
    archivo = finders.find(ruta)
    if archivo:
        url += f'?v={int(os.path.getmtime(archivo))}'
    return url
