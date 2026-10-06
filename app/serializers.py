from rest_framework import serializers
from scr.bd_lup.stores.models import Tienda


class TiendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tienda
        fields = [
            'id',
            'nombre_fantasia',
            'direccion',
            'cuit',
            'horario_atencion',
        ]