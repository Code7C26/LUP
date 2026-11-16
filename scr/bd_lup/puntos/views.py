from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.translation import gettext as _
from django.views.decorators.http import require_POST

from scr.bd_lup.products import notificaciones

from .models import PESOS_POR_PUNTO, Canje, ProductoMerch, saldo_de
from .servicios import CanjeError, canjear, cancelar_canje

EJEMPLOS = [1900, 2000, 3900, 4000, 6500]   # los del documento "Sistema de Puntos"


def mis_puntos(request):
    """Cómo funcionan los puntos, el merch para canjear y, si es consumidor, su saldo e historial."""
    usuario = request.user
    es_consumidor = usuario.is_authenticated and usuario.es_consumidor
    saldo = saldo_de(usuario) if es_consumidor else 0
    productos = list(ProductoMerch.objects.filter(activo=True))
    for p in productos:
        p.alcanza = es_consumidor and saldo >= p.puntos
        p.progreso = min(100, round(saldo * 100 / p.puntos)) if p.puntos else 100
        p.faltan = max(0, p.puntos - saldo)
    contexto = {
        'es_consumidor': es_consumidor,
        'saldo': saldo,
        'productos': productos,
        'pesos_por_punto': PESOS_POR_PUNTO,
        'ejemplos': [(monto, monto // PESOS_POR_PUNTO) for monto in EJEMPLOS],
    }
    if es_consumidor:
        contexto['movimientos'] = usuario.movimientos_puntos.select_related('canje__producto')[:30]
        contexto['canjes'] = usuario.canjes.select_related('producto')[:20]
    return render(request, 'puntos/mis_puntos.html', contexto)


@login_required
@require_POST
def canjear_producto(request, pk):
    try:
        canje = canjear(request.user, pk)
    except CanjeError as e:
        messages.error(request, str(e))
    else:
        notificaciones.avisar_canje(canje)
        messages.success(
            request,
            _('¡Canjeaste %(producto)s! Tu código es %(codigo)s. Te vamos a escribir para coordinar la entrega.')
            % {'producto': canje.producto.nombre, 'codigo': canje.codigo},
        )
    return redirect('mis_puntos')


@login_required
@require_POST
def cancelar(request, pk):
    canje = get_object_or_404(Canje, pk=pk, usuario=request.user)
    try:
        cancelar_canje(canje)
    except CanjeError as e:
        messages.error(request, str(e))
    else:
        messages.success(request, _('Cancelaste el canje. Los %(puntos)s puntos volvieron a tu cuenta.') % {'puntos': canje.puntos})
    return redirect('mis_puntos')
