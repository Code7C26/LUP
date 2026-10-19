from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from scr.bd_lup.products import views as product_views
from scr.bd_lup.products.api import ProductoViewSet
from scr.bd_lup.stores import views as store_views
from scr.bd_lup.users import api as users_api  # ← NUEVO

router = DefaultRouter()
router.register('productos', ProductoViewSet, basename='api-productos')

urlpatterns = [
    path('', product_views.home, name='home'),
    path('panel/', product_views.panel, name='panel'),
    path('productos/', include('scr.bd_lup.products.urls')),
    path('comercios/<int:pk>/', store_views.detalle_tienda, name='detalle_tienda'),
    path('usuarios/', include('scr.bd_lup.users.urls')),
    path('api/auth/login/', users_api.login, name='api_login'),                  # ← NUEVO
    path('api/auth/registro/<str:rol>/', users_api.registro, name='api_registro'),  # ← NUEVO
    path('api/auth/yo/', users_api.yo, name='api_yo'),                          # ← NUEVO
    path('api/', include(router.urls)),
    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)