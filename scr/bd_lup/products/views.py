from django.shortcuts import render
from .models import Producto  # Importa el modelo Producto de ESTA misma app

def lista_productos(request):
    # Filtramos los productos que estén marcados como DISPONIBLES
    productos = Producto.objects.filter(estado='DISPONIBLE')
    return render(request, 'catalogo_productos.html', {'productos': productos})