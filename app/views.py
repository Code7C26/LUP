from rest_framework.views import APIView
from rest_framework.response import Response

from scr.bd_lup.products.models import Producto


class ProductoListAPIView(APIView):

    def get(self, request):
        productos = Producto.objects.all()

        data = []

        for producto in productos:
            data.append({
                'id': producto.id,
                'titulo': producto.titulo,
                'descripcion': producto.descripcion,
                'precio_original': producto.precio_original,
                'precio_descuento': producto.precio_descuento,
                'es_donacion': producto.es_donacion,
                'stock': producto.stock,
                'fecha_vencimiento': producto.fecha_vencimiento,
            })

        return Response(data)