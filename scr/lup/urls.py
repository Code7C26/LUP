from django.contrib import admin
from django.urls import path, include
from scr.lup.views import home

urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),
    path('usuarios/', include('scr.bd_lup.users.urls')),
    path('productos/', include('scr.bd_lup.products.urls')),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)  