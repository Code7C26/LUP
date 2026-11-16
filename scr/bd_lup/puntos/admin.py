from django.contrib import admin, messages
from django.utils.translation import gettext_lazy as _

from .models import Canje, MovimientoPuntos, ProductoMerch
from .servicios import CanjeError, cancelar_canje, entregar_canje


@admin.register(ProductoMerch)
class ProductoMerchAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio', 'puntos', 'activo', 'orden')
    list_editable = ('activo', 'orden')


@admin.register(Canje)
class CanjeAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'usuario', 'producto', 'puntos', 'estado', 'creado_en', 'entregado_en')
    list_filter = ('estado', 'producto')
    search_fields = ('codigo', 'usuario__username', 'usuario__email')
    readonly_fields = ('usuario', 'producto', 'puntos', 'codigo', 'estado', 'creado_en', 'entregado_en')
    actions = ['marcar_entregados', 'cancelar_y_devolver']

    def has_add_permission(self, request):
        return False   # los canjes los hace cada persona desde "Mis puntos"

    @admin.action(description=_('Marcar como entregados'))
    def marcar_entregados(self, request, queryset):
        for canje in queryset.filter(estado=Canje.PENDIENTE):
            entregar_canje(canje)
        messages.success(request, _('Listo.'))

    @admin.action(description=_('Cancelar y devolver los puntos'))
    def cancelar_y_devolver(self, request, queryset):
        for canje in queryset:
            try:
                cancelar_canje(canje)
            except CanjeError:
                pass
        messages.success(request, _('Listo.'))


@admin.register(MovimientoPuntos)
class MovimientoPuntosAdmin(admin.ModelAdmin):
    """Para sumar o restar puntos a mano: un movimiento de tipo "Ajuste del equipo"."""
    list_display = ('usuario', 'puntos', 'motivo', 'detalle', 'creado_en')
    list_filter = ('motivo',)
    search_fields = ('usuario__username', 'usuario__email', 'detalle')
    autocomplete_fields = ('usuario',)
    readonly_fields = ('reserva', 'canje')
