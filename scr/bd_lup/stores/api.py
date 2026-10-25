"""API de comercios para la app (paso 40: "Cerca tuyo")."""
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response

from scr.bd_lup.products.models import Producto

from .models import Tienda
from .ubicacion import distancia_km, leer_coordenadas, url_como_llegar


class TiendaSerializer(serializers.ModelSerializer):
    rubro_texto = serializers.CharField(source='get_rubro_display', read_only=True)
    ofertas = serializers.IntegerField(read_only=True)
    distancia_km = serializers.SerializerMethodField()
    como_llegar = serializers.SerializerMethodField()

    class Meta:
        model = Tienda
        fields = [
            'id', 'nombre_fantasia', 'rubro', 'rubro_texto', 'descripcion', 'direccion',
            'horario_atencion', 'latitud', 'longitud', 'ofertas', 'distancia_km', 'como_llegar',
        ]

    def get_distancia_km(self, tienda):
        distancia = getattr(tienda, 'distancia_km', None)
        return round(distancia, 2) if distancia is not None else None

    def get_como_llegar(self, tienda):
        return url_como_llegar(tienda)


def _tiendas_con_ofertas():
    """Comercios con la cantidad de ofertas disponibles (igual que la home de la web)."""
    return Tienda.objects.annotate(
        ofertas=Count('productos', filter=Q(productos__in=Producto.objects.visibles()))
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
    """Datos de un comercio (con su distancia si se manda ?lat=&lng=)."""
    tienda = get_object_or_404(_tiendas_con_ofertas(), pk=pk)
    lat, lng = leer_coordenadas(request.query_params.get('lat'), request.query_params.get('lng'))
    _calcular_distancia(tienda, lat, lng)
    return Response(TiendaSerializer(tienda).data)
