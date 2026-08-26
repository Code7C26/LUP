from django.urls import path
from scr.bd_lup.users.views import registrar_usuario

urlpatterns = [
    path('registro/', registrar_usuario, name='registro'),
]
