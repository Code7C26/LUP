from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('users/', include('scr.bd_lup.users.urls')),
    path('productos/', include('scr.bd_lup.products.urls')), # O la ruta exacta de la app
]