from django.urls import path

from . import views

urlpatterns = [
    path('ingresar/', views.login_view, name='login'),
    path('salir/', views.logout_view, name='logout'),
    path('registro/', views.registro_seleccion_view, name='registro_seleccion'),
    path('registro/<str:rol>/', views.registro_view, name='registro'),
    path('perfil/', views.perfil_view, name='perfil'),
]
