from datetime import timedelta
from decimal import Decimal

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.timezone import localdate
from django.views.decorators.http import require_POST

from scr.bd_lup.stores.models import Tienda
from scr.bd_lup.stores.ubicacion import distancia_km, leer_coordenadas
from scr.bd_lup.users.decorators import rol_requerido
from scr.bd_lup.users.models import Usuario

from .forms import CalificacionForm, ProductoForm, ReservaForm, SolicitudDonacionForm
from .models import Calificacion, Producto, Reserva, SolicitudDonacion, resumen_calificaciones

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
        'destacados': visibles.con_calificacion()[:6],
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
    productos = Producto.objects.visibles().select_related('comercio').con_calificacion()

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

    # Ubicación del dispositivo (la manda el navegador cuando la persona toca "Cerca mío")
    lat, lng = leer_coordenadas(request.GET.get('lat'), request.GET.get('lng'))
    if lat is not None:
        productos = list(productos)
        for producto in productos:
            tienda = producto.comercio
            producto.distancia_km = (
                distancia_km(lat, lng, tienda.latitud, tienda.longitud) if tienda.tiene_ubicacion else None
            )
        if orden == 'cercania':
            # Los comercios sin ubicación cargada quedan al final
            productos.sort(key=lambda p: (p.distancia_km is None, p.distancia_km or 0))

    contexto = {
        'productos': productos,
        'categorias': Producto.CATEGORIAS,
        'rubros': Tienda.RUBROS,
        'filtros': {'q': q, 'categoria': categoria, 'rubro': rubro, 'donacion': solo_donacion, 'orden': orden},
        'ubicacion': {'lat': lat, 'lng': lng} if lat is not None else None,
    }
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return render(request, 'products/_grilla.html', contexto)
    return render(request, 'products/catalogo.html', contexto)


def detalle_producto(request, pk):
    producto = get_object_or_404(Producto.objects.select_related('comercio').con_calificacion(), pk=pk)
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
        Producto.objects.visibles().filter(comercio=producto.comercio).exclude(pk=producto.pk).con_calificacion()[:3]
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


@solo_consumidores
@require_POST
def calificar_reserva(request, pk):
    """El consumidor califica al comercio (1 a 5 estrellas) después de retirar. Puede cambiarla luego."""
    reserva = get_object_or_404(
        Reserva.objects.select_related('producto__comercio'),
        pk=pk, consumidor=request.user, estado=Reserva.RETIRADA,
    )
    existente = Calificacion.objects.filter(reserva=reserva).first()
    form = CalificacionForm(request.POST, instance=existente)
    if form.is_valid():
        calificacion = form.save(commit=False)
        calificacion.reserva = reserva
        calificacion.tienda = reserva.producto.comercio
        calificacion.consumidor = request.user
        calificacion.save()
        messages.success(request, f'¡Gracias! Tu opinión sobre {reserva.producto.comercio} ya está publicada.')
    else:
        messages.error(request, 'Elegí de 1 a 5 estrellas para calificar.')
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


MENSAJES_ESTADO = {
    Producto.AGOTADO: '"{}" quedó marcado como vendido y ya no aparece en el catálogo.',
    Producto.PAUSADO: '"{}" quedó como no disponible. Podés volver a publicarlo cuando quieras.',
    Producto.DISPONIBLE: '"{}" volvió a estar publicado en el catálogo.',
}


@solo_comercios
@require_POST
def cambiar_estado_producto(request, pk):
    """Marcar una publicación como vendida, no disponible o volver a publicarla."""
    producto = get_object_or_404(Producto, pk=pk, comercio__usuario=request.user)
    nuevo = request.POST.get('estado')
    if nuevo not in Producto.ESTADOS_MANUALES or producto.estado == Producto.DONADO:
        messages.error(request, 'No se puede cambiar el estado de esta publicación.')
    elif nuevo == Producto.DISPONIBLE and producto.stock <= 0:
        messages.warning(request, 'No le queda stock. Editá la publicación para cargar unidades y volver a publicarla.')
        return redirect('editar_excedente', pk=pk)
    elif nuevo == Producto.DISPONIBLE and producto.fecha_vencimiento < localdate():
        messages.warning(request, 'La fecha límite de retiro ya pasó. Actualizala para volver a publicarla.')
        return redirect('editar_excedente', pk=pk)
    else:
        producto.estado = nuevo
        producto.save(update_fields=['estado', 'actualizado_en'])
        messages.success(request, MENSAJES_ESTADO[nuevo].format(producto.titulo))
    return redirect('panel')


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
    if accion not in ('aprobar', 'rechazar'):
        raise Http404('Acción inválida')
    solicitud = get_object_or_404(
        SolicitudDonacion,
        pk=pk,
        producto__comercio__usuario=request.user,
        estado=SolicitudDonacion.PENDIENTE,
    )
    if accion == 'aprobar':
        with transaction.atomic():
            producto = Producto.objects.select_for_update().get(pk=solicitud.producto_id)
            if not producto.esta_disponible:
                messages.error(request, 'Este producto ya no está disponible para donar (sin stock, vencido o ya donado).')
                return redirect('panel')
            solicitud.estado = SolicitudDonacion.APROBADA
            solicitud.save(update_fields=['estado'])
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
            'calificaciones': resumen_calificaciones(tienda) if tienda else {'promedio': None, 'cantidad': 0},
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
            'donaciones_disponibles': Producto.objects.visibles().filter(es_donacion=True).select_related('comercio').con_calificacion()[:6],
            'stats': {
                'total': solicitudes.count(),
                'aprobadas': solicitudes.filter(estado=SolicitudDonacion.APROBADA).count(),
                'pendientes': solicitudes.filter(estado=SolicitudDonacion.PENDIENTE).count(),
            },
        }
        return render(request, 'panel/organizacion.html', contexto)

    reservas = Reserva.objects.filter(consumidor=usuario).select_related('producto__comercio', 'calificacion')
    no_canceladas = reservas.exclude(estado=Reserva.CANCELADA)
    # Ahorro = lo que hubiera costado a precio original menos lo que realmente se pagó
    ahorro = sum(
        (max(r.producto.precio_original * r.cantidad - r.precio_total, Decimal('0')) for r in no_canceladas),
        Decimal('0'),
    )
    contexto = {
        'reservas_pendientes': reservas.filter(estado=Reserva.PENDIENTE),
        'historial': reservas.exclude(estado=Reserva.PENDIENTE),
        'por_calificar': reservas.filter(estado=Reserva.RETIRADA, calificacion__isnull=True)[:3],
        'recomendados': Producto.objects.visibles().select_related('comercio').con_calificacion()[:3],
        'stats': {
            'reservas': no_canceladas.count(),
            'rescatados': no_canceladas.aggregate(t=Sum('cantidad'))['t'] or 0,
            'ahorro': ahorro,
        },
    }
    return render(request, 'panel/consumidor.html', contexto)


# ==========================================
# ESTADÍSTICAS DEL COMERCIO (#99)
# ==========================================

PERIODOS = {'7': 7, '30': 30, '90': 90}


@solo_comercios
def estadisticas_comercio(request):
    tienda = _tienda_de(request.user)
    if tienda is None:
        messages.error(request, 'Completá los datos de tu comercio para ver tus estadísticas.')
        return redirect('perfil')

    clave = request.GET.get('dias', '30')
    dias = PERIODOS.get(clave, 30)
    clave = str(dias)
    hoy = localdate()
    desde = hoy - timedelta(days=dias - 1)

    reservas = Reserva.objects.filter(producto__comercio=tienda, creada_en__date__gte=desde)
    retiradas = reservas.filter(estado=Reserva.RETIRADA)
    totales = retiradas.aggregate(unidades=Sum('cantidad'), ingresos=Sum('precio_total'))
    unidades = totales['unidades'] or 0
    ingresos = totales['ingresos'] or Decimal('0')
    cuenta = {
        estado: reservas.filter(estado=estado).count()
        for estado in (Reserva.RETIRADA, Reserva.PENDIENTE, Reserva.CANCELADA)
    }
    cerradas = cuenta[Reserva.RETIRADA] + cuenta[Reserva.CANCELADA]

    # Ahorro que le dio el comercio a sus clientes (precio original - precio pagado)
    ahorro_clientes = sum(
        (max(r.producto.precio_original * r.cantidad - r.precio_total, Decimal('0'))
         for r in retiradas.select_related('producto')),
        Decimal('0'),
    )

    # Unidades rescatadas por día (según la fecha de la reserva)
    por_dia = {
        fila['dia']: fila['unidades']
        for fila in retiradas.annotate(dia=TruncDate('creada_en')).values('dia').annotate(unidades=Sum('cantidad'))
    }
    serie = [{'fecha': desde + timedelta(days=i), 'valor': por_dia.get(desde + timedelta(days=i), 0)} for i in range(dias)]
    maximo = max((d['valor'] for d in serie), default=0)
    for d in serie:
        d['alto'] = round(d['valor'] * 100 / maximo) if maximo else 0

    top = list(
        retiradas.values('producto__titulo').annotate(unidades=Sum('cantidad'), ingresos=Sum('precio_total'))
        .order_by('-unidades')[:5]
    )
    top_max = top[0]['unidades'] if top else 0
    for fila in top:
        fila['ancho'] = round(fila['unidades'] * 100 / top_max) if top_max else 0

    donaciones = SolicitudDonacion.objects.filter(
        producto__comercio=tienda, estado=SolicitudDonacion.APROBADA, creada_en__date__gte=desde
    ).count()
    calif = tienda.calificaciones.filter(creada_en__date__gte=desde)
    resumen_periodo = calif.aggregate(promedio=Avg('puntaje'), cantidad=Count('pk'))

    contexto = {
        'tienda': tienda,
        'periodo': clave,
        'periodos': [('7', '7 días'), ('30', '30 días'), ('90', '90 días')],
        'desde': desde,
        'hoy': hoy,
        'kpis': {
            'unidades': unidades,
            'ingresos': ingresos,
            'reservas': sum(cuenta.values()),
            'tasa_retiro': round(cuenta[Reserva.RETIRADA] * 100 / cerradas) if cerradas else None,
            'ahorro_clientes': ahorro_clientes,
            'donaciones': donaciones,
        },
        'cuenta': cuenta,
        'serie': serie,
        'maximo': maximo,
        'mitad': maximo // 2 if maximo and maximo % 2 == 0 else None,
        'top': top,
        'calificaciones': resumen_periodo,
        'calificaciones_total': resumen_calificaciones(tienda),
        'publicaciones': {
            'activas': Producto.objects.filter(comercio=tienda).visibles().count(),
            'total': Producto.objects.filter(comercio=tienda).count(),
        },
    }
    return render(request, 'panel/estadisticas.html', contexto)
