from django.urls import path
from scr.lup import views
from scr.bd_lup.users import views as user_views

urlpatterns = [
    # Ruta principal y catálogo
    path('', views.home, name='home'),
    path('catalogo/', views.catalogo_productos, name='catalogo_productos'),
    path('productos/', views.catalogo_productos, name='catalogo_productos'),

    # Autenticación y Registro (importados desde la app users)
    path('usuarios/login/', views.login_view, name='login'),
    path('usuarios/logout/', views.logout_view, name='logout'),
    path('usuarios/register/', user_views.register_view, name='register'),
    path('usuarios/registro-seleccion/', user_views.registro_seleccion_view, name='registro_seleccion'),
    path('usuarios/registro-consumidor/', user_views.registro_consumidor_view, name='registro_consumidor'),
    path('usuarios/registro-comercio/', user_views.registro_comercio_view, name='registro_comercio'),

    # Gestión de excedentes y perfil de comercio
    path('publicar/', views.publicar_excedente, name='publicar_excedente'),
    path('mi-perfil/', views.mi_perfil_comercio, name='mi_perfil_comercio'),
    path('eliminar/<int:producto_id>/', views.eliminar_excedente, name='eliminar_excedente'),
    path('solicitar-donacion/<int:producto_id>/', views.solicitar_donacion_lup, name='solicitar_donacion_lup'),
]