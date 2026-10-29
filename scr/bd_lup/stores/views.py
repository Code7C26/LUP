from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404, render

from scr.bd_lup.products.models import Producto, resumen_calificaciones

from .models import Tienda


def detalle_tienda(request, pk):
    tienda = get_object_or_404(Tienda, pk=pk)
    productos = Producto.objects.visibles().filter(comercio=tienda).select_related('comercio').con_calificacion()
    resumen = resumen_calificaciones(tienda)
    # Cuántas opiniones hay de cada puntaje (5 → 1), para las barras
    conteo = {n: 0 for n in range(5, 0, -1)}
    for puntaje in tienda.calificaciones.values_list('puntaje', flat=True):
        conteo[puntaje] += 1
    opiniones = Paginator(
        tienda.calificaciones.select_related('consumidor', 'reserva__producto'), 6
    ).get_page(request.GET.get('opiniones'))
    return render(request, 'stores/detalle_tienda.html', {
        'tienda': tienda,
        'productos': productos,
        'calificaciones': resumen,
        'distribucion': [
            {'puntaje': n, 'cantidad': c, 'porcentaje': round(c * 100 / resumen['cantidad']) if resumen['cantidad'] else 0}
            for n, c in conteo.items()
        ],
        'opiniones': opiniones,
    })
