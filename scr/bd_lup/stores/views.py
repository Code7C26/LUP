from django.shortcuts import get_object_or_404, render

from scr.bd_lup.products.models import Producto

from .models import Tienda


def detalle_tienda(request, pk):
    tienda = get_object_or_404(Tienda, pk=pk)
    productos = Producto.objects.visibles().filter(comercio=tienda)
    return render(request, 'stores/detalle_tienda.html', {'tienda': tienda, 'productos': productos})
