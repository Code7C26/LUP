from rest_framework import serializers
from scr.bd_lup.products.models import Producto


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = [
            'id',
            'titulo',
            'descripcion',
            'precio_original',
            'precio_descuento',
            'es_donacion',
            'stock',
            'fecha_vencimiento',
        ]