from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from scr.bd_lup.products import api as products_api
from scr.bd_lup.products import views as product_views
from scr.bd_lup.products.api import ProductoViewSet
from scr.bd_lup.stores import views as store_views
from scr.bd_lup.users import api as users_api

router = DefaultRouter()
router.register('productos', ProductoViewSet, basename='api-productos')
router.register('mis-productos', products_api.MisProductosViewSet, basename='api-mis-productos')  # paso 30

urlpatterns = [
    # Web
    path('', product_views.home, name='home'),
    path('panel/', product_views.panel, name='panel'),
    path('productos/', include('scr.bd_lup.products.urls')),
    path('comercios/<int:pk>/', store_views.detalle_tienda, name='detalle_tienda'),
    path('usuarios/', include('scr.bd_lup.users.urls')),

    # API: cuentas (paso 28)
    path('api/auth/login/', users_api.login, name='api_login'),
    path('api/auth/registro/<str:rol>/', users_api.registro, name='api_registro'),
    path('api/auth/yo/', users_api.yo, name='api_yo'),

    # API: consumidor (paso 29)
    path('api/productos/<int:pk>/reservar/', products_api.reservar, name='api_reservar'),
    path('api/mis-reservas/', products_api.mis_reservas, name='api_mis_reservas'),
    path('api/reservas/<int:pk>/cancelar/', products_api.cancelar_reserva, name='api_cancelar_reserva'),

    # API: comercio (paso 30)
    path('api/mis-productos/<int:pk>/estado/', products_api.cambiar_estado, name='api_cambiar_estado'),
    path('api/reservas-del-comercio/', products_api.reservas_del_comercio, name='api_reservas_comercio'),
    path('api/retiros/confirmar/', products_api.confirmar_retiro, name='api_confirmar_retiro'),
    path('api/mis-solicitudes/', products_api.mis_solicitudes, name='api_mis_solicitudes'),
    path('api/solicitudes/<int:pk>/<str:accion>/', products_api.responder_solicitud, name='api_responder_solicitud'),

    # API: lista de productos y "mis productos" (router)
    path('api/', include(router.urls)),

    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)