from django.urls import path
from . import views

urlpatterns = [
    path('', views.catalogo_productos, name='catalogo_productos'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('publicar/', views.publicar_excedente, name='publicar_excedente'),
    path('mi-perfil/', views.mi_perfil_comercio, name='mi_perfil_comercio'),
    path('eliminar/<int:producto_id>/', views.eliminar_excedente, name='eliminar_excedente'),
    path('solicitar-donacion/<int:producto_id>/', views.solicitar_donacion_lup, name='solicitar_donacion_lup'),
]