from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Organizacion, Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('username', 'email', 'rol', 'first_name', 'last_name', 'is_active')
    list_filter = ('rol', 'is_staff', 'is_active')
    fieldsets = UserAdmin.fieldsets + (('Lüp', {'fields': ('rol', 'telefono', 'ciudad')}),)
    add_fieldsets = UserAdmin.add_fieldsets + (('Lüp', {'fields': ('email', 'rol')}),)


@admin.register(Organizacion)
class OrganizacionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'cuit', 'personas_asistidas')
    list_filter = ('tipo',)
    search_fields = ('nombre', 'cuit')
