from decimal import Decimal

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.users.decorators import rol_requerido
from scr.bd_lup.users.models import Usuario

from .forms import ProductoForm, ReservaForm, SolicitudDonacionForm
from .models import Producto, Reserva, SolicitudDonacion

ORDENES = {
    'recientes': '-creado_en',
    'precio': 'precio_descuento',
    'vencimiento': 'fecha_vencimiento',
}

solo_comercios = rol_requerido(Usuario.COMERCIO, mensaje='Esta sección es exclusiva para comercios.')
solo_consumidores = rol_requerido(Usuario.CONSUMIDOR, mensaje='Solo los consumidores pueden reservar ofertas.')
solo_organizaciones = rol_requerido(
    Usuario.ORGANIZACION, mensaje='Solo las organizaciones registradas pueden solicitar donaciones.'
)


def _tienda_de(usuario):
    return getattr(usuario, 'tienda', None)


# ==========================================
# PÁGINAS PÚBLICAS
# ==========================================

def home(request):
    visibles = Producto.objects.visibles().select_related('comercio')
    contexto = {
        'destacados': visibles[:6],
        'tiendas': Tienda.objects.annotate(
            ofertas=Count('productos', filter=Q(productos__in=Producto.objects.visibles()))
        ).order_by('-ofertas')[:6],
        'stats': {
            'ofertas': visibles.count(),
            'comercios': Tienda.objects.count(),
            'rescatados': Reserva.objects.filter(estado=Reserva.RETIRADA).aggregate(t=Sum('cantidad'))['t'] or 0,
            'organizaciones': Usuario.objects.filter(rol=Usuario.ORGANIZACION).count(),
        },
    }
    return render(request, 'home.html', contexto)


def catalogo(request):
    productos = Producto.objects.visibles().select_related('comercio')

    q = request.GET.get('q', '').strip()
    categoria = request.GET.get('categoria', '')
    rubro = request.GET.get('rubro', '')
    solo_donacion = request.GET.get('donacion') == '1'
    orden = request.GET.get('orden', 'recientes')

    if q:
        productos = productos.filter(
            Q(titulo__icontains=q)
            | Q(descripcion__icontains=q)
            | Q(comercio__nombre_fantasia__icontains=q)
            | Q(comercio__direccion__icontains=q)
        )
    if categoria in dict(Producto.CATEGORIAS):
        productos = productos.filter(categoria=categoria)
    if rubro in dict(Tienda.RUBROS):
        productos = productos.filter(comercio__rubro=rubro)
    if solo_donacion:
        productos = productos.filter(es_donacion=True)
    productos = productos.order_by(ORDENES.get(orden, '-creado_en'))

    contexto = {
        'productos': productos,
        'categorias': Producto.CATEGORIAS,
        'rubros': Tienda.RUBROS,
        'filtros': {'q': q, 'categoria': categoria, 'rubro': rubro, 'donacion': solo_donacion, 'orden': orden},
    }
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return render(request, 'products/_grilla.html', contexto)
    return render(request, 'products/catalogo.html', contexto)


def detalle_producto(request, pk):
    producto = get_object_or_404(Producto.objects.select_related('comercio'), pk=pk)
    usuario = request.user
    contexto = {'producto': producto}
    if usuario.is_authenticated:
        if usuario.es_consumidor:
            contexto['form_reserva'] = ReservaForm(producto=producto, initial={'cantidad': 1})
        elif usuario.es_organizacion and producto.es_donacion:
            contexto['form_donacion'] = SolicitudDonacionForm()
            contexto['ya_solicitada'] = producto.solicitudes_donacion.filter(organizacion=usuario).exists()
        elif usuario.es_comercio and producto.comercio == _tienda_de(usuario):
            contexto['es_propio'] = True
    contexto['relacionados'] = (
        Producto.objects.visibles().filter(comercio=producto.comercio).exclude(pk=producto.pk)[:3]
    )
    return render(request, 'products/detalle.html', contexto)


# ==========================================
# CONSUMIDORES
# ==========================================

@solo_consumidores
@require_POST
def reservar(request, pk):
    with transaction.atomic():
        producto = get_object_or_404(Producto.objects.select_for_update(), pk=pk)
        if not producto.esta_disponible:
            messages.error(request, 'Esta oferta ya no está disponible.')
            return redirect('catalogo')
        form = ReservaForm(request.POST, producto=producto)
        if not form.is_valid():
            for error in form.errors.get('cantidad', []):
                messages.error(request, error)
            return redirect('detalle_producto', pk=pk)
        reserva = form.save(commit=False)
        reserva.consumidor = request.user
        reserva.producto = producto
        reserva.precio_total = producto.precio_descuento * reserva.cantidad
        reserva.save()
        producto.descontar_stock(reserva.cantidad)

    messages.success(
        request,
        f'¡Reserva confirmada! Mostrá el código {reserva.codigo_retiro} en {producto.comercio} para retirarla.',
    )
    return redirect('panel')


@solo_consumidores
@require_POST
def cancelar_reserva(request, pk):
    with transaction.atomic():
        reserva = get_object_or_404(
            Reserva.objects.select_for_update(), pk=pk, consumidor=request.user, estado=Reserva.PENDIENTE
        )
        producto = Producto.objects.select_for_update().get(pk=reserva.producto_id)
        reserva.estado = Reserva.CANCELADA
        reserva.save(update_fields=['estado'])
        producto.stock += reserva.cantidad
        if producto.estado == Producto.AGOTADO:
            producto.estado = Producto.DISPONIBLE
        producto.save(update_fields=['stock', 'estado', 'actualizado_en'])
    messages.info(request, 'Reserva cancelada. Las unidades volvieron a estar disponibles.')
    return redirect('panel')


# ==========================================
# ORGANIZACIONES
# ==========================================

@solo_organizaciones
@require_POST
def solicitar_donacion(request, pk):
    producto = get_object_or_404(Producto, pk=pk, es_donacion=True)
    if not producto.esta_disponible:
        messages.error(request, 'Esta donación ya no está disponible.')
        return redirect('catalogo')
    if producto.solicitudes_donacion.filter(organizacion=request.user).exists():
        messages.info(request, 'Ya enviaste una solicitud por este producto.')
        return redirect('panel')

    form = SolicitudDonacionForm(request.POST)
    if form.is_valid():
        solicitud = form.save(commit=False)
        solicitud.organizacion = request.user
        solicitud.producto = producto
        solicitud.save()
        messages.success(request, f'Tu solicitud por "{producto.titulo}" fue enviada a {producto.comercio}.')
        return redirect('panel')
    messages.error(request, 'Escribí un mensaje para el comercio.')
    return redirect('detalle_producto', pk=pk)


# ==========================================
# COMERCIOS
# ==========================================

@solo_comercios
def publicar_excedente(request):
    tienda = _tienda_de(request.user)
    if tienda is None:
        messages.error(request, 'Completá los datos de tu comercio antes de publicar.')
        return redirect('perfil')

    form = ProductoForm(request.POST or None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        producto = form.save(commit=False)
        producto.comercio = tienda
        producto.save()
        messages.success(request, '¡Excedente publicado! Ya aparece en el catálogo.')
        return redirect('panel')
    return render(request, 'products/form_producto.html', {'form': form, 'editando': False})


@solo_comercios
def editar_excedente(request, pk):
    producto = get_object_or_404(Producto, pk=pk, comercio__usuario=request.user)
    form = ProductoForm(request.POST or None, request.FILES or None, instance=producto)
    if request.method == 'POST' and form.is_valid():
        producto = form.save(commit=False)
        if producto.stock > 0 and producto.estado == Producto.AGOTADO:
            producto.estado = Producto.DISPONIBLE
        producto.save()
        messages.success(request, 'Publicación actualizada.')
        return redirect('panel')
    return render(request, 'products/form_producto.html', {'form': form, 'editando': True, 'producto': producto})


@solo_comercios
def eliminar_excedente(request, pk):
    producto = get_object_or_404(Producto, pk=pk, comercio__usuario=request.user)
    if request.method == 'POST':
        producto.delete()
        messages.success(request, 'Publicación eliminada.')
        return redirect('panel')
    return render(request, 'products/confirmar_eliminacion.html', {'producto': producto})


@solo_comercios
@require_POST
def confirmar_retiro(request):
    codigo = request.POST.get('codigo', '').strip().upper()
    reserva = Reserva.objects.filter(
        codigo_retiro=codigo, producto__comercio__usuario=request.user
    ).first()
    if reserva is None:
        messages.error(request, f'No encontramos una reserva con el código "{codigo}".')
    elif reserva.estado != Reserva.PENDIENTE:
        messages.warning(request, f'La reserva {codigo} ya está {reserva.get_estado_display().lower()}.')
    else:
        reserva.estado = Reserva.RETIRADA
        reserva.save(update_fields=['estado'])
        messages.success(
            request, f'Retiro confirmado: {reserva.cantidad} × {reserva.producto} para {reserva.consumidor.nombre_visible}.'
        )
    return redirect('panel')


@solo_comercios
@require_POST
def responder_donacion(request, pk, accion):
    solicitud = get_object_or_404(
        SolicitudDonacion,
        pk=pk,
        producto__comercio__usuario=request.user,
        estado=SolicitudDonacion.PENDIENTE,
    )
    if accion == 'aprobar':
        with transaction.atomic():
            solicitud.estado = SolicitudDonacion.APROBADA
            solicitud.save(update_fields=['estado'])
            producto = solicitud.producto
            producto.estado = Producto.DONADO
            producto.save(update_fields=['estado', 'actualizado_en'])
            producto.solicitudes_donacion.filter(estado=SolicitudDonacion.PENDIENTE).update(
                estado=SolicitudDonacion.RECHAZADA
            )
        messages.success(request, f'Donación aprobada para {solicitud.organizacion.nombre_visible}. ¡Gracias!')
    else:
        solicitud.estado = SolicitudDonacion.RECHAZADA
        solicitud.save(update_fields=['estado'])
        messages.info(request, 'Solicitud rechazada.')
    return redirect('panel')


# ==========================================
# PANEL PERSONAL (SEGÚN ROL)
# ==========================================

@login_required
def panel(request):
    usuario = request.user

    if usuario.es_comercio:
        tienda = _tienda_de(usuario)
        productos = Producto.objects.filter(comercio=tienda) if tienda else Producto.objects.none()
        reservas = Reserva.objects.filter(producto__comercio=tienda).select_related('producto', 'consumidor')
        retiradas = reservas.filter(estado=Reserva.RETIRADA)
        contexto = {
            'tienda': tienda,
            'productos': productos,
            'reservas_pendientes': reservas.filter(estado=Reserva.PENDIENTE),
            'solicitudes': SolicitudDonacion.objects.filter(
                producto__comercio=tienda, estado=SolicitudDonacion.PENDIENTE
            ).select_related('producto', 'organizacion'),
            'stats': {
                'activas': productos.visibles().count(),
                'pendientes': reservas.filter(estado=Reserva.PENDIENTE).count(),
                'rescatados': retiradas.aggregate(t=Sum('cantidad'))['t'] or 0,
                'ingresos': retiradas.aggregate(t=Sum('precio_total'))['t'] or Decimal('0'),
            },
        }
        return render(request, 'panel/comercio.html', contexto)

    if usuario.es_organizacion:
        solicitudes = SolicitudDonacion.objects.filter(organizacion=usuario).select_related('producto__comercio')
        contexto = {
            'solicitudes': solicitudes,
            'donaciones_disponibles': Producto.objects.visibles().filter(es_donacion=True).select_related('comercio')[:6],
            'stats': {
                'total': solicitudes.count(),
                'aprobadas': solicitudes.filter(estado=SolicitudDonacion.APROBADA).count(),
                'pendientes': solicitudes.filter(estado=SolicitudDonacion.PENDIENTE).count(),
            },
        }
        return render(request, 'panel/organizacion.html', contexto)

    reservas = Reserva.objects.filter(consumidor=usuario).select_related('producto__comercio')
    no_canceladas = reservas.exclude(estado=Reserva.CANCELADA)
    ahorro = sum(
        ((r.producto.precio_original - r.producto.precio_descuento) * r.cantidad for r in no_canceladas),
        Decimal('0'),
    )
    contexto = {
        'reservas_pendientes': reservas.filter(estado=Reserva.PENDIENTE),
        'historial': reservas.exclude(estado=Reserva.PENDIENTE),
        'recomendados': Producto.objects.visibles().select_related('comercio')[:3],
        'stats': {
            'reservas': no_canceladas.count(),
            'rescatados': no_canceladas.aggregate(t=Sum('cantidad'))['t'] or 0,
            'ahorro': ahorro,
        },
    }
    return render(request, 'panel/consumidor.html', contexto)
