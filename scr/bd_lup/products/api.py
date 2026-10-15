"""API REST de solo lectura pensada para la futura app móvil."""
from rest_framework import serializers, viewsets

from .models import Producto


class ProductoSerializer(serializers.ModelSerializer):
    comercio = serializers.CharField(source='comercio.nombre_fantasia', read_only=True)
    direccion = serializers.CharField(source='comercio.direccion', read_only=True)
    porcentaje_descuento = serializers.IntegerField(read_only=True)

    class Meta:
        model = Producto
        fields = [
            'id',
            'titulo',
            'descripcion',
            'categoria',
            'comercio',
            'direccion',
            'imagen',
            'precio_original',
            'precio_descuento',
            'porcentaje_descuento',
            'es_donacion',
            'stock',
            'fecha_vencimiento',
        ]


class ProductoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductoSerializer

    def get_queryset(self):
        return Producto.objects.visibles().select_related('comercio')
