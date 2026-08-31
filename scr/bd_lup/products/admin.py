from django.contrib import admin
from .models import Producto  

admin.site.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'comercio', 'precio_descuento', 'stock', 'estado', 'fecha_vencimiento')
    list_filter = ('estado', 'es_donacion', 'creado_en')
    search_fields = ('titulo', 'descripcion')
