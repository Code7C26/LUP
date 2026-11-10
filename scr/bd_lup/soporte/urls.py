from django.urls import path

from . import views

urlpatterns = [
    path('mensaje/', views.mensaje, name='soporte_mensaje'),
    path('persona/', views.derivar, name='soporte_derivar'),
]
