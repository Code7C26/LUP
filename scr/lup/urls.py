from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from scr.bd_lup.products import views as product_views
from scr.bd_lup.products.api import ProductoViewSet
from scr.bd_lup.stores import views as store_views

router = DefaultRouter()
router.register('productos', ProductoViewSet, basename='api-productos')

urlpatterns = [
    path('', product_views.home, name='home'),
    path('panel/', product_views.panel, name='panel'),
    path('productos/', include('scr.bd_lup.products.urls')),
    path('comercios/<int:pk>/', store_views.detalle_tienda, name='detalle_tienda'),
    path('usuarios/', include('scr.bd_lup.users.urls')),
    path('api/', include(router.urls)),
    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
