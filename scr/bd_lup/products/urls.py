from django.urls import path

from . import carrito, views

urlpatterns = [
    path('', views.catalogo, name='catalogo'),
    path('<int:pk>/', views.detalle_producto, name='detalle_producto'),
    path('<int:pk>/reservar/', views.reservar, name='reservar'),
    path('<int:pk>/solicitar-donacion/', views.solicitar_donacion, name='solicitar_donacion'),
    path('publicar/', views.publicar_excedente, name='publicar_excedente'),
    path('sugerir/', views.sugerir_producto, name='sugerir_producto'),  # "Completar con IA"
    path('<int:pk>/editar/', views.editar_excedente, name='editar_excedente'),
    path('<int:pk>/eliminar/', views.eliminar_excedente, name='eliminar_excedente'),
    path('<int:pk>/estado/', views.cambiar_estado_producto, name='cambiar_estado_producto'),
    # Carrito: varias reservas confirmadas juntas
    path('carrito/', carrito.ver_carrito, name='carrito'),
    path('carrito/confirmar/', carrito.confirmar, name='confirmar_carrito'),
    path('carrito/vaciar/', carrito.vaciar, name='vaciar_carrito'),
    path('<int:pk>/agregar-al-carrito/', carrito.agregar, name='agregar_al_carrito'),
    path('carrito/<int:pk>/actualizar/', carrito.actualizar, name='actualizar_carrito'),
    path('carrito/<int:pk>/quitar/', carrito.quitar, name='quitar_del_carrito'),
    path('reservas/<int:pk>/cancelar/', views.cancelar_reserva, name='cancelar_reserva'),
    path('reservas/<int:pk>/calificar/', views.calificar_reserva, name='calificar_reserva'),
    path('opiniones/<int:pk>/responder/', views.responder_opinion, name='responder_opinion'),
    path('reservas/confirmar-retiro/', views.confirmar_retiro, name='confirmar_retiro'),
    path(
        'donaciones/<int:pk>/<str:accion>/',
        views.responder_donacion,
        name='responder_donacion',
    ),
]
