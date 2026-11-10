from django.contrib import admin

from .models import Conversacion, Mensaje


class MensajeInline(admin.TabularInline):
    model = Mensaje
    extra = 0
    readonly_fields = ('rol', 'texto', 'con_ia', 'creado_en')
    can_delete = False


@admin.register(Conversacion)
class ConversacionAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'usuario', 'derivada', 'email_contacto', 'resuelta', 'actualizada_en')
    list_filter = ('derivada', 'resuelta')
    list_editable = ('resuelta',)
    search_fields = ('usuario__username', 'email_contacto', 'mensajes__texto')
    readonly_fields = ('usuario', 'sesion', 'pagina', 'creada_en', 'actualizada_en')
    inlines = [MensajeInline]
