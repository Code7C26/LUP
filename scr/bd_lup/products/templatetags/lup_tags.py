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


# ---------- Google Maps ----------

@register.filter
def como_llegar(tienda):
    """Link de Google Maps con el recorrido hasta el comercio."""
    from scr.bd_lup.stores.ubicacion import url_como_llegar
    return url_como_llegar(tienda)


@register.filter
def mapa_embebido(tienda):
    """URL del mapa de Google para usar en un <iframe>."""
    from scr.bd_lup.stores.ubicacion import url_mapa_embebido
    return url_mapa_embebido(tienda)


@register.filter
def distancia(km):
    """Formatea una distancia: 350 m, 1,2 km, 12 km."""
    if km is None or km == '':
        return ''
    km = float(km)
    if km < 1:
        return f'{max(round(km * 1000 / 10) * 10, 10):.0f} m'
    if km < 10:
        return f'{km:.1f} km'.replace('.', ',')
    return f'{km:.0f} km'


# ---------- Calificaciones ----------

@register.filter
def estrellas(valor):
    """Lista de 5 elementos ('llena', 'media', 'vacia') para dibujar un promedio de estrellas."""
    try:
        valor = float(valor or 0)
    except (TypeError, ValueError):
        valor = 0
    resultado = []
    for i in range(1, 6):
        if valor >= i - 0.25:
            resultado.append('llena')
        elif valor >= i - 0.75:
            resultado.append('media')
        else:
            resultado.append('vacia')
    return resultado


@register.filter
def promedio(valor):
    """4.666 → '4,7'."""
    if valor is None or valor == '':
        return ''
    return f'{float(valor):.1f}'.replace('.', ',')
