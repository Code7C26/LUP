from django import template

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
