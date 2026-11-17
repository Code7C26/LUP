"""API de Puntos Lüp para la app (solo consumidores, con el token de la app).

Usa las mismas reglas y funciones que la web (servicios.py y views.py):

    GET  /api/puntos/                       → saldo, merch para canjear, mis canjes y movimientos
    POST /api/puntos/canjear/<id>/          → canjea un producto de merch (servicios.canjear)
    POST /api/puntos/canjes/<id>/cancelar/  → cancela un canje propio que todavía no se entregó

Los errores de las reglas (no alcanzan los puntos, producto inactivo, canje ya entregado) vuelven con
400 y {"error": "<el mensaje de CanjeError>"}, en el idioma que pide la app (Accept-Language).
"""
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext as _
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response

from scr.bd_lup.products import notificaciones
from scr.bd_lup.products.permisos import EsConsumidor

from .models import PESOS_POR_PUNTO, Canje, MovimientoPuntos, ProductoMerch, saldo_de
from .servicios import CanjeError, canjear, cancelar_canje

MAX_MOVIMIENTOS = 30   # como la web (views.mis_puntos)
MAX_CANJES = 20


def _merch(producto, saldo):
    return {
        'id': producto.id,
        'nombre': producto.nombre,
        'descripcion': producto.descripcion,
        'precio': producto.precio,
        'puntos': producto.puntos,
        'imagen': producto.imagen.url if producto.imagen else None,
        'icono': producto.icono,   # ícono de Bootstrap Icons de la web (la app lo cambia por uno suyo)
        'puedo_canjear': saldo >= producto.puntos,
    }


def _canje(canje):
    return {
        'id': canje.id,
        'producto': canje.producto.nombre,
        'puntos': canje.puntos,
        'codigo': canje.codigo,
        'estado': canje.estado,
        'creado_en': canje.creado_en,
    }


def _movimiento(movimiento):
    reserva = movimiento.reserva
    return {
        'puntos': movimiento.puntos,
        'motivo': movimiento.motivo,
        'detalle': movimiento.detalle,
        # Para "Compra en Panadería El Sol" (solo en las compras)
        'comercio': reserva.producto.comercio.nombre_fantasia if reserva else None,
        'creado_en': movimiento.creado_en,
    }


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([EsConsumidor])
def mis_puntos(request):
    usuario = request.user
    saldo = saldo_de(usuario)
    movimientos = MovimientoPuntos.objects.filter(usuario=usuario).select_related('reserva__producto__comercio')
    canjes = Canje.objects.filter(usuario=usuario).select_related('producto')
    return Response({
        'saldo': saldo,
        'pesos_por_punto': PESOS_POR_PUNTO,
        'merch': [_merch(p, saldo) for p in ProductoMerch.objects.filter(activo=True)],
        'canjes': [_canje(c) for c in canjes[:MAX_CANJES]],
        'movimientos': [_movimiento(m) for m in movimientos[:MAX_MOVIMIENTOS]],
    })


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([EsConsumidor])
def canjear_producto(request, pk):
    try:
        canje = canjear(request.user, pk)
    except CanjeError as e:
        return Response({'error': str(e)}, status=400)
    notificaciones.avisar_canje(canje)   # igual que la web: a quien canjeó y al equipo de Lüp
    return Response({
        'mensaje': _('¡Canjeaste %(producto)s! Tu código es %(codigo)s. Te vamos a escribir para coordinar la entrega.')
        % {'producto': canje.producto.nombre, 'codigo': canje.codigo},
        'saldo': saldo_de(request.user),
        'canje': _canje(canje),
    }, status=201)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([EsConsumidor])
def cancelar(request, pk):
    canje = get_object_or_404(Canje.objects.select_related('producto'), pk=pk, usuario=request.user)
    try:
        canje = cancelar_canje(canje)
    except CanjeError as e:
        return Response({'error': str(e)}, status=400)
    return Response({
        'mensaje': _('Cancelaste el canje. Los %(puntos)s puntos volvieron a tu cuenta.') % {'puntos': canje.puntos},
        'saldo': saldo_de(request.user),
        'canje': _canje(canje),
    })
