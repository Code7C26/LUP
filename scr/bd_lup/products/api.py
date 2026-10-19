"""API REST de Lüp para la app móvil."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Producto, Reserva
from .permisos import EsConsumidor




class ProductoSerializer(serializers.ModelSerializer):
    comercio = serializers.CharField(source='comercio.nombre_fantasia', read_only=True)
    direccion = serializers.CharField(source='comercio.direccion', read_only=True)
    porcentaje_descuento = serializers.IntegerField(read_only=True)

    class Meta:
        model = Producto
        fields = [
            'id', 'titulo', 'descripcion', 'categoria', 'comercio', 'direccion', 'imagen',
            'precio_original', 'precio_descuento', 'porcentaje_descuento',
            'es_donacion', 'stock', 'fecha_vencimiento',
        ]


class ProductoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductoSerializer

    def get_queryset(self):
        return Producto.objects.visibles().select_related('comercio')



class ReservaSerializer(serializers.ModelSerializer):
    """Convierte una reserva en datos que la app puede leer."""
    producto_id = serializers.IntegerField(source='producto.id', read_only=True)
    producto = serializers.CharField(source='producto.titulo', read_only=True)
    comercio = serializers.CharField(source='producto.comercio.nombre_fantasia', read_only=True)
    direccion = serializers.CharField(source='producto.comercio.direccion', read_only=True)
    horario = serializers.CharField(source='producto.comercio.horario_atencion', read_only=True)
    estado_texto = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = Reserva
        fields = [
            'id', 'producto_id', 'producto', 'comercio', 'direccion', 'horario',
            'cantidad', 'precio_total', 'codigo_retiro', 'estado', 'estado_texto', 'creada_en',
        ]


@api_view(['POST'])
@permission_classes([EsConsumidor])
def reservar(request, pk):
    """Reserva un producto. La app manda: {"cantidad": 2}"""
    try:
        cantidad = int(request.data.get('cantidad', 1))
    except (TypeError, ValueError):
        return Response({'error': 'Cantidad inválida.'}, status=400)

    with transaction.atomic():
        producto = get_object_or_404(Producto.objects.select_for_update(), pk=pk)
        if not producto.esta_disponible or not 1 <= cantidad <= producto.stock:
            return Response({'error': 'No hay stock suficiente.'}, status=400)
        reserva = Reserva.objects.create(
            consumidor=request.user,
            producto=producto,
            cantidad=cantidad,
            precio_total=producto.precio_descuento * cantidad,
        )
        producto.descontar_stock(cantidad)

    return Response(ReservaSerializer(reserva).data, status=201)


@api_view(['GET'])
@permission_classes([EsConsumidor])
def mis_reservas(request):
    """Lista las reservas del usuario (pendientes, retiradas y canceladas)."""
    reservas = Reserva.objects.filter(consumidor=request.user).select_related('producto__comercio')
    return Response(ReservaSerializer(reservas, many=True).data)


@api_view(['POST'])
@permission_classes([EsConsumidor])
def cancelar_reserva(request, pk):
    """Cancela una reserva pendiente y devuelve las unidades al stock."""
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

    return Response(ReservaSerializer(reserva).data)
