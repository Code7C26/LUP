from django.core.paginator import Paginator
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404, render

from scr.bd_lup.products.models import Producto, resumen_calificaciones

from .models import Tienda
from .ubicacion import RADIOS_KM, leer_coordenadas, leer_radio, ordenar_por_cercania


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


def lista_tiendas(request):
    """Comercios adheridos. Con la ubicación del cliente se ordenan por cercanía dentro del radio elegido."""
    tiendas = Tienda.objects.select_related('usuario').annotate(
        ofertas=Count('productos', filter=Q(productos__in=Producto.objects.visibles()), distinct=True),
        calif_promedio=Avg('calificaciones__puntaje'),
        calif_cantidad=Count('calificaciones', distinct=True),
    )
    q = request.GET.get('q', '').strip()
    if q:
        tiendas = tiendas.filter(Q(nombre_fantasia__icontains=q) | Q(direccion__icontains=q))
    rubro = request.GET.get('rubro', '')
    if rubro in dict(Tienda.RUBROS):
        tiendas = tiendas.filter(rubro=rubro)

    lat, lng = leer_coordenadas(request.GET.get('lat'), request.GET.get('lng'))
    radio = leer_radio(request.GET.get('radio'))
    fuera_de_radio = 0
    if lat is not None:
        tiendas, fuera_de_radio = ordenar_por_cercania(tiendas, lat, lng, radio)
    else:
        tiendas = list(tiendas.order_by('-ofertas', 'nombre_fantasia'))

    return render(request, 'stores/lista_tiendas.html', {
        'tiendas': tiendas,
        'ubicacion': {'lat': lat, 'lng': lng} if lat is not None else None,
        'radio': radio,
        'radios': RADIOS_KM,
        'fuera_de_radio': fuera_de_radio,
        'rubros': Tienda.RUBROS,
        'filtros': {'q': q, 'rubro': rubro},
    })
