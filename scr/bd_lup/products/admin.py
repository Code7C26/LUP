from django.contrib import admin

from .models import Calificacion, Producto, Reserva, SolicitudDonacion


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'comercio', 'precio_descuento', 'stock', 'estado', 'fecha_vencimiento')
    list_filter = ('estado', 'es_donacion', 'categoria', 'creado_en')
    search_fields = ('titulo', 'descripcion')


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ('codigo_retiro', 'producto', 'consumidor', 'cantidad', 'precio_total', 'estado', 'creada_en')
    list_filter = ('estado',)
    search_fields = ('codigo_retiro',)


@admin.register(SolicitudDonacion)
class SolicitudDonacionAdmin(admin.ModelAdmin):
    list_display = ('producto', 'organizacion', 'estado', 'creada_en')
    list_filter = ('estado',)


@admin.register(Calificacion)
class CalificacionAdmin(admin.ModelAdmin):
    list_display = ('tienda', 'puntaje', 'consumidor', 'creada_en')
    list_filter = ('puntaje', 'tienda')
    search_fields = ('comentario', 'tienda__nombre_fantasia')
    raw_id_fields = ('reserva',)
