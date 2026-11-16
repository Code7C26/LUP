from django.urls import path

from . import views

urlpatterns = [
    path('', views.mis_puntos, name='mis_puntos'),
    path('canjear/<int:pk>/', views.canjear_producto, name='canjear_merch'),
    path('canjes/<int:pk>/cancelar/', views.cancelar, name='cancelar_canje'),
]
