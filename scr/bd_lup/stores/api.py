"""API de comercios para la app (paso 40: "Cerca tuyo")."""
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response

from scr.bd_lup.products.models import Calificacion, Producto

from .models import Tienda

OPINIONES_EN_DETALLE = 20  # las últimas N opiniones que trae /api/comercios/<id>/
from .ubicacion import distancia_km, leer_coordenadas, url_como_llegar


class TiendaSerializer(serializers.ModelSerializer):
    rubro_texto = serializers.CharField(source='get_rubro_display', read_only=True)
    ofertas = serializers.IntegerField(read_only=True)
    distancia_km = serializers.SerializerMethodField()
    como_llegar = serializers.SerializerMethodField()
    # Campos nuevos (#98): promedio de estrellas y cantidad de opiniones
    calificacion_promedio = serializers.SerializerMethodField()
    calificaciones = serializers.IntegerField(source='calif_cantidad', read_only=True, default=0)

    class Meta:
        model = Tienda
        fields = [
            'id', 'nombre_fantasia', 'rubro', 'rubro_texto', 'descripcion', 'direccion',
            'horario_atencion', 'latitud', 'longitud', 'ofertas', 'distancia_km', 'como_llegar',
            'calificacion_promedio', 'calificaciones',
        ]

    def get_calificacion_promedio(self, tienda):
        valor = getattr(tienda, 'calif_promedio', None)
        return round(valor, 1) if valor is not None else None

    def get_distancia_km(self, tienda):
        distancia = getattr(tienda, 'distancia_km', None)
        return round(distancia, 2) if distancia is not None else None

    def get_como_llegar(self, tienda):
        return url_como_llegar(tienda)


class OpinionSerializer(serializers.ModelSerializer):
    """Una opinión pública sobre el comercio (solo en el detalle, no en la lista)."""
    producto = serializers.SerializerMethodField()
    autor = serializers.SerializerMethodField()

    class Meta:
        model = Calificacion
        fields = [
            'id', 'puntaje', 'puntaje_producto', 'comentario', 'producto', 'autor',
            'creada_en', 'respuesta', 'respondida_en',
        ]

    def get_producto(self, calificacion):
        return calificacion.producto.titulo if calificacion.producto_id else None

    def get_autor(self, calificacion):
        # Privacidad: solo el nombre de pila (nunca apellido, usuario ni email)
        return (calificacion.consumidor.first_name or '').strip() or 'Cliente de Lüp'


def _tiendas_con_ofertas():
    """Comercios con la cantidad de ofertas disponibles (igual que la home de la web)."""
    return Tienda.objects.annotate(
        ofertas=Count('productos', filter=Q(productos__in=Producto.objects.visibles()), distinct=True),
        calif_promedio=Avg('calificaciones__puntaje'),
        calif_cantidad=Count('calificaciones', distinct=True),
    )


def _calcular_distancia(tienda, lat, lng):
    if lat is not None and tienda.tiene_ubicacion:
        tienda.distancia_km = distancia_km(lat, lng, tienda.latitud, tienda.longitud)
    else:
        tienda.distancia_km = None


@api_view(['GET'])
def comercios(request):
    """Lista de comercios. Con ?lat=&lng= se ordena del más cercano al más lejano."""
    lat, lng = leer_coordenadas(request.query_params.get('lat'), request.query_params.get('lng'))
    tiendas = list(_tiendas_con_ofertas())
    for tienda in tiendas:
        _calcular_distancia(tienda, lat, lng)
    if lat is not None:
        # Los que no tienen ubicación cargada van al final
        tiendas.sort(key=lambda t: (t.distancia_km is None, t.distancia_km or 0))
    else:
        tiendas.sort(key=lambda t: -t.ofertas)
    return Response(TiendaSerializer(tiendas, many=True).data)


@api_view(['GET'])
def detalle_comercio(request, pk):
    """Datos de un comercio (con su distancia si se manda ?lat=&lng=) y sus últimas opiniones."""
    tienda = get_object_or_404(_tiendas_con_ofertas(), pk=pk)
    lat, lng = leer_coordenadas(request.query_params.get('lat'), request.query_params.get('lng'))
    _calcular_distancia(tienda, lat, lng)
    datos = TiendaSerializer(tienda).data
    opiniones = (
        Calificacion.objects.filter(tienda=tienda)
        .select_related('consumidor', 'producto')
        .order_by('-creada_en', '-pk')[:OPINIONES_EN_DETALLE]
    )
    datos['opiniones'] = OpinionSerializer(opiniones, many=True).data
    return Response(datos)
