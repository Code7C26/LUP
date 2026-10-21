"""API REST de Lüp para la app móvil."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.timezone import localdate
from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from .permisos import EsComercio, EsConsumidor, EsOrganizacion

from .models import Producto, Reserva, SolicitudDonacion
from .permisos import EsComercio, EsConsumidor


# ==========================================
# PRODUCTOS 
# ==========================================

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


# ==========================================
# RESERVAS DEL CONSUMIDOR 
# ==========================================

class ReservaSerializer(serializers.ModelSerializer):
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
    try:
        cantidad = int(request.data.get('cantidad', 1))
    except (TypeError, ValueError):
        return Response({'error': 'Cantidad inválida.'}, status=400)
    with transaction.atomic():
        producto = get_object_or_404(Producto.objects.select_for_update(), pk=pk)
        if not producto.esta_disponible or not 1 <= cantidad <= producto.stock:
            return Response({'error': 'No hay stock suficiente.'}, status=400)
        reserva = Reserva.objects.create(
            consumidor=request.user, producto=producto, cantidad=cantidad,
            precio_total=producto.precio_descuento * cantidad,
        )
        producto.descontar_stock(cantidad)
    return Response(ReservaSerializer(reserva).data, status=201)


@api_view(['GET'])
@permission_classes([EsConsumidor])
def mis_reservas(request):
    reservas = Reserva.objects.filter(consumidor=request.user).select_related('producto__comercio')
    return Response(ReservaSerializer(reservas, many=True).data)


@api_view(['POST'])
@permission_classes([EsConsumidor])
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
    return Response(ReservaSerializer(reserva).data)


# ==========================================
# ACCIONES DEL COMERCIO 
# ==========================================

class MiProductoSerializer(ProductoSerializer):
    estado = serializers.CharField(read_only=True)

    class Meta(ProductoSerializer.Meta):
        fields = ProductoSerializer.Meta.fields + ['estado']

    def validate(self, datos):
        original = datos.get('precio_original', getattr(self.instance, 'precio_original', None))
        descuento = datos.get('precio_descuento', getattr(self.instance, 'precio_descuento', None))
        if original is not None and descuento is not None and descuento > original:
            raise serializers.ValidationError(
                {'precio_descuento': 'El precio Lüp no puede ser mayor al precio original.'})
        fecha = datos.get('fecha_vencimiento')
        if fecha and fecha < localdate():
            raise serializers.ValidationError(
                {'fecha_vencimiento': 'La fecha límite no puede estar en el pasado.'})
        return datos


class MisProductosViewSet(viewsets.ModelViewSet):
    serializer_class = MiProductoSerializer
    permission_classes = [EsComercio]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Producto.objects.filter(comercio__usuario=self.request.user).select_related('comercio')

    def perform_create(self, serializer):
        tienda = getattr(self.request.user, 'tienda', None)
        if tienda is None:
            raise serializers.ValidationError({'error': 'Completá los datos de tu comercio antes de publicar.'})
        serializer.save(comercio=tienda)


@api_view(['POST'])
@permission_classes([EsComercio])
def cambiar_estado(request, pk):
    producto = get_object_or_404(Producto, pk=pk, comercio__usuario=request.user)
    permitidos = [Producto.DISPONIBLE, Producto.AGOTADO]  # paso 19: sumar Producto.PAUSADO
    nuevo = request.data.get('estado')
    if nuevo not in permitidos:
        return Response({'error': 'Estado inválido.'}, status=400)
    producto.estado = nuevo
    producto.save(update_fields=['estado', 'actualizado_en'])
    return Response(MiProductoSerializer(producto).data)


@api_view(['GET'])
@permission_classes([EsComercio])
def reservas_del_comercio(request):
    reservas = Reserva.objects.filter(
        producto__comercio__usuario=request.user, estado=Reserva.PENDIENTE
    ).select_related('producto__comercio')
    return Response(ReservaSerializer(reservas, many=True).data)


@api_view(['POST'])
@permission_classes([EsComercio])
def confirmar_retiro(request):
    codigo = str(request.data.get('codigo', '')).strip().upper()
    reserva = Reserva.objects.filter(
        codigo_retiro=codigo, producto__comercio__usuario=request.user
    ).select_related('producto', 'consumidor').first()
    if reserva is None:
        return Response({'error': f'No encontramos una reserva con el código "{codigo}".'}, status=404)
    if reserva.estado != Reserva.PENDIENTE:
        return Response({'error': f'Esa reserva ya está {reserva.get_estado_display().lower()}.'}, status=400)
    reserva.estado = Reserva.RETIRADA
    reserva.save(update_fields=['estado'])
    return Response({
        'mensaje': f'Retiro confirmado: {reserva.cantidad} × {reserva.producto.titulo} '
                   f'para {reserva.consumidor.nombre_visible}.',
        'reserva': ReservaSerializer(reserva).data,
    })


class SolicitudSerializer(serializers.ModelSerializer):
    producto_id = serializers.IntegerField(source='producto.id', read_only=True)
    producto = serializers.CharField(source='producto.titulo', read_only=True)
    organizacion = serializers.CharField(source='organizacion.nombre_visible', read_only=True)
    estado_texto = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = SolicitudDonacion
        fields = ['id', 'producto_id', 'producto', 'organizacion', 'mensaje', 'estado', 'estado_texto', 'creada_en']


@api_view(['GET'])
@permission_classes([EsComercio])
def mis_solicitudes(request):
    solicitudes = SolicitudDonacion.objects.filter(
        producto__comercio__usuario=request.user
    ).select_related('producto', 'organizacion')
    return Response(SolicitudSerializer(solicitudes, many=True).data)


@api_view(['POST'])
@permission_classes([EsComercio])
def responder_solicitud(request, pk, accion):
    if accion not in ('aprobar', 'rechazar'):
        return Response({'error': 'Acción inválida.'}, status=404)
    solicitud = get_object_or_404(
        SolicitudDonacion, pk=pk, producto__comercio__usuario=request.user, estado=SolicitudDonacion.PENDIENTE
    )
    if accion == 'aprobar':
        with transaction.atomic():
            producto = Producto.objects.select_for_update().get(pk=solicitud.producto_id)
            if not producto.esta_disponible:
                return Response({'error': 'Este producto ya no está disponible para donar.'}, status=400)
            solicitud.estado = SolicitudDonacion.APROBADA
            solicitud.save(update_fields=['estado'])
            producto.estado = Producto.DONADO
            producto.save(update_fields=['estado', 'actualizado_en'])
            producto.solicitudes_donacion.filter(estado=SolicitudDonacion.PENDIENTE).update(
                estado=SolicitudDonacion.RECHAZADA
            )
    else:
        solicitud.estado = SolicitudDonacion.RECHAZADA
        solicitud.save(update_fields=['estado'])
    return Response(SolicitudSerializer(solicitud).data)

# ==========================================
# ACCIONES DE LA ORGANIZACIÓN 
# ==========================================

@api_view(['GET'])
@permission_classes([EsOrganizacion])
def donaciones_disponibles(request):
    """Productos que los comercios marcaron como aptos para donación y siguen disponibles."""
    productos = Producto.objects.visibles().filter(es_donacion=True).select_related('comercio')
    return Response(ProductoSerializer(productos, many=True).data)


@api_view(['POST'])
@permission_classes([EsOrganizacion])
def solicitar_donacion(request, pk):
    """La organización pide un producto. La app manda: {"mensaje": "Para 40 chicos del comedor"}"""
    producto = get_object_or_404(Producto, pk=pk, es_donacion=True)
    if not producto.esta_disponible:
        return Response({'error': 'Esta donación ya no está disponible.'}, status=400)
    if producto.solicitudes_donacion.filter(organizacion=request.user).exists():
        return Response({'error': 'Ya enviaste una solicitud por este producto.'}, status=400)
    mensaje = str(request.data.get('mensaje', '')).strip()
    if not mensaje:
        return Response({'mensaje': ['Escribí un mensaje para el comercio.']}, status=400)
    solicitud = SolicitudDonacion.objects.create(
        organizacion=request.user, producto=producto, mensaje=mensaje
    )
    return Response(SolicitudSerializer(solicitud).data, status=201)


@api_view(['GET'])
@permission_classes([EsOrganizacion])
def mis_solicitudes_donacion(request):
    """Las solicitudes que hizo la organización, con su estado (pendiente, aprobada o rechazada)."""
    solicitudes = SolicitudDonacion.objects.filter(
        organizacion=request.user
    ).select_related('producto', 'organizacion')
    return Response(SolicitudSerializer(solicitudes, many=True).data)