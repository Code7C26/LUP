from django.contrib import admin

from .models import Tienda


@admin.register(Tienda)
class TiendaAdmin(admin.ModelAdmin):
    list_display = ('nombre_fantasia', 'rubro', 'direccion', 'cuit', 'usuario')
    list_filter = ('rubro',)
    search_fields = ('nombre_fantasia', 'cuit', 'direccion')
