"""Carrito de reservas.

El consumidor junta varias ofertas (de uno o varios comercios) y las reserva todas juntas.
Se guarda en la sesión del navegador, así que no hace falta tocar la base de datos hasta confirmar.
Al confirmar se crea una Reserva por producto, cada una con su código de retiro: el pago sigue
siendo en cada local, igual que una reserva individual.
"""
from decimal import Decimal

from django.contrib import messages
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.translation import gettext as _, gettext_lazy, ngettext
from django.views.decorators.http import require_POST

from scr.bd_lup.users.decorators import rol_requerido
from scr.bd_lup.users.models import Usuario

from scr.bd_lup.puntos.models import puntos_por_monto

from .models import Producto, Reserva

CLAVE = 'carrito'
MAX_PRODUCTOS = 20  # productos distintos por carrito

solo_consumidores = rol_requerido(
    Usuario.CONSUMIDOR, mensaje=gettext_lazy('Solo los consumidores pueden usar el carrito.')
)


class Carrito:
    """Envoltorio de la sesión: {"id_producto": cantidad}."""

    def __init__(self, request):
        self.session = request.session
        datos = self.session.get(CLAVE)
        self.datos = {str(k): int(v) for k, v in datos.items()} if isinstance(datos, dict) else {}

    def _guardar(self):
        self.session[CLAVE] = self.datos
        self.session.modified = True

    def __len__(self):
        """Cantidad total de unidades (lo que muestra el globito del menú)."""
        return sum(self.datos.values())

    def __contains__(self, producto_id):
        return str(producto_id) in self.datos

    def cantidad_de(self, producto_id):
        return self.datos.get(str(producto_id), 0)

    def poner(self, producto_id, cantidad):
        if cantidad <= 0:
            self.quitar(producto_id)
            return
        self.datos[str(producto_id)] = int(cantidad)
        self._guardar()

    def quitar(self, producto_id):
        if self.datos.pop(str(producto_id), None) is not None:
            self._guardar()

    def vaciar(self):
        self.datos = {}
        self._guardar()

    def items(self):
        """Lista de ítems con su producto, ya revisados contra el stock actual.

        Si un producto dejó de estar disponible o tiene menos stock, lo marca (y ajusta la cantidad
        guardada) para avisarle al consumidor antes de confirmar.
        """
        productos = {
            str(p.pk): p
            for p in Producto.objects.filter(pk__in=self.datos.keys()).select_related('comercio')
        }
        items, cambio = [], False
        for pid, cantidad in list(self.datos.items()):
            producto = productos.get(pid)
            if producto is None:
                self.datos.pop(pid)
                cambio = True
                continue
            aviso = ''
            if not producto.esta_disponible:
                aviso = _('Ya no está disponible.')
            elif cantidad > producto.stock:
                cantidad = producto.stock
                self.datos[pid] = cantidad
                cambio = True
                aviso = ngettext(
                    'Queda solo %(n)s unidad: ajustamos la cantidad.',
                    'Quedan solo %(n)s unidades: ajustamos la cantidad.',
                    producto.stock,
                ) % {'n': producto.stock}
            items.append({
                'producto': producto,
                'cantidad': cantidad,
                'subtotal': producto.precio_descuento * cantidad,
                'disponible': producto.esta_disponible,
                'aviso': aviso,
            })
        if cambio:
            self._guardar()
        return items


def resumen(items):
    """Totales del carrito y los ítems agrupados por comercio (cada uno se retira en su local)."""
    validos = [i for i in items if i['disponible']]
    total = sum((i['subtotal'] for i in validos), Decimal('0'))
    ahorro = sum(
        ((i['producto'].precio_original - i['producto'].precio_descuento) * i['cantidad'] for i in validos),
        Decimal('0'),
    )
    grupos = {}
    for item in items:
        tienda = item['producto'].comercio
        grupo = grupos.setdefault(tienda.pk, {'comercio': tienda, 'items': [], 'subtotal': Decimal('0')})
        grupo['items'].append(item)
        if item['disponible']:
            grupo['subtotal'] += item['subtotal']
    return {
        'grupos': list(grupos.values()),
        'total': total,
        'ahorro': ahorro,
        'unidades': sum(i['cantidad'] for i in validos),
        # Los puntos se cuentan por reserva (cada producto es una reserva aparte)
        'puntos': sum(puntos_por_monto(i['subtotal']) for i in validos),
        'hay_no_disponibles': any(not i['disponible'] for i in items),
        'se_puede_confirmar': bool(validos),
    }


def _leer_cantidad(request, defecto=1):
    try:
        return int(request.POST.get('cantidad', defecto))
    except (TypeError, ValueError):
        return defecto


# ==========================================
# VISTAS
# ==========================================

@solo_consumidores
def ver_carrito(request):
    items = Carrito(request).items()
    return render(request, 'products/carrito.html', {'items': items, **resumen(items)})


@solo_consumidores
@require_POST
def agregar(request, pk):
    producto = get_object_or_404(Producto, pk=pk)
    if not producto.esta_disponible:
        messages.error(request, _('Esta oferta ya no está disponible.'))
        return redirect('catalogo')
    carrito = Carrito(request)
    if pk not in carrito and len(carrito.datos) >= MAX_PRODUCTOS:
        messages.error(request, _('Tu carrito ya tiene %(n)s productos distintos. Reservalos antes de sumar más.') % {'n': MAX_PRODUCTOS})
        return redirect('carrito')
    cantidad = max(1, _leer_cantidad(request))
    nueva = carrito.cantidad_de(pk) + cantidad
    if nueva > producto.stock:
        nueva = producto.stock
        messages.warning(
            request,
            _('Solo quedan %(n)s unidades de %(producto)s: dejamos esa cantidad en tu carrito.')
            % {'n': producto.stock, 'producto': producto.titulo},
        )
    else:
        messages.success(request, _('Agregaste %(producto)s a tu carrito.') % {'producto': producto.titulo})
    carrito.poner(pk, nueva)
    if request.POST.get('ir_al_carrito'):
        return redirect('carrito')
    return redirect('detalle_producto', pk=pk)


@solo_consumidores
@require_POST
def actualizar(request, pk):
    carrito = Carrito(request)
    if pk in carrito:
        producto = Producto.objects.filter(pk=pk).first()
        cantidad = _leer_cantidad(request, carrito.cantidad_de(pk))
        if producto is not None and cantidad > producto.stock:
            cantidad = producto.stock
            messages.warning(request, _('Solo quedan %(n)s unidades.') % {'n': producto.stock})
        carrito.poner(pk, cantidad)
    return redirect('carrito')


@solo_consumidores
@require_POST
def quitar(request, pk):
    Carrito(request).quitar(pk)
    messages.info(request, _('Quitamos el producto de tu carrito.'))
    return redirect('carrito')


@solo_consumidores
@require_POST
def vaciar(request):
    Carrito(request).vaciar()
    messages.info(request, _('Vaciaste tu carrito.'))
    return redirect('carrito')


@solo_consumidores
@require_POST
def confirmar(request):
    """Reserva todo el carrito junto: o se reservan todos los productos, o ninguno."""
    carrito = Carrito(request)
    if not carrito.datos:
        messages.info(request, _('Tu carrito está vacío.'))
        return redirect('catalogo')

    problemas = []
    reservas = []
    with transaction.atomic():
        ids = sorted(int(pid) for pid in carrito.datos)  # mismo orden siempre: evita bloqueos cruzados
        productos = {p.pk: p for p in Producto.objects.select_for_update().filter(pk__in=ids)}
        for pid in ids:
            producto = productos.get(pid)
            cantidad = carrito.cantidad_de(pid)
            if producto is None or not producto.esta_disponible:
                problemas.append(_('%(producto)s ya no está disponible.') % {
                    'producto': producto.titulo if producto else _('Un producto')})
            elif cantidad > producto.stock:
                problemas.append(ngettext(
                    'De %(producto)s queda solo %(n)s unidad.',
                    'De %(producto)s quedan solo %(n)s unidades.',
                    producto.stock,
                ) % {'producto': producto.titulo, 'n': producto.stock})
        if not problemas:
            for pid in ids:
                producto = productos[pid]
                cantidad = carrito.cantidad_de(pid)
                reservas.append(Reserva.objects.create(
                    consumidor=request.user,
                    producto=producto,
                    cantidad=cantidad,
                    precio_total=producto.precio_descuento * cantidad,
                ))
                producto.descontar_stock(cantidad)

    if problemas:
        for texto in problemas:
            messages.error(request, texto)
        messages.warning(request, _('No reservamos nada todavía: revisá tu carrito y confirmá de nuevo.'))
        return redirect('carrito')

    carrito.vaciar()
    comercios = len({r.producto.comercio_id for r in reservas})
    messages.success(
        request,
        ngettext(
            '¡Listo! Reservaste %(n)s producto. Tu código de retiro está en tu panel.',
            '¡Listo! Reservaste %(n)s productos en %(c)s comercio(s). Cada uno tiene su código de retiro en tu panel.',
            len(reservas),
        ) % {'n': len(reservas), 'c': comercios},
    )
    return redirect('panel')


# ==========================================
# PARA LAS PLANTILLAS
# ==========================================

def context_processor(request):
    """Cantidad de unidades en el carrito, para el ícono del menú (solo consumidores)."""
    usuario = getattr(request, 'user', None)
    if not usuario or not usuario.is_authenticated or not usuario.es_consumidor:
        return {}
    return {'CARRITO_CANTIDAD': len(Carrito(request))}
