from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register_view, name='register'), 


# Nuevas rutas agregadas para el flujo de selección y registros específicos
    path('registro/', views.registro_seleccion_view, name='registro_seleccion'),
    path('registro/consumidor/', views.registro_consumidor_view, name='registro_consumidor'),
    path('registro/comercio/', views.registro_comercio_view, name='registro_comercio'),
]