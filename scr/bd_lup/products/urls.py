from django.urls import path
from . import views

urlpatterns = [
    path('', views.lista_productos, name='catalogo'),
    path('crear/', views.crear_producto, name='crear_producto'),
]