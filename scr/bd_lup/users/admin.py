from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from scr.bd_lup.users.models import Usuario
admin.site.register(Usuario, UserAdmin)
