from django.urls import path
from . import views

urlpatterns = [
    path('', views.lista_productos, name='catalogo'),
    path('publicar/', views.publicar_excedente, name='publicar_excedente'),
]