from django.contrib.auth import views as auth_views
from django.urls import path, reverse_lazy

from . import views
from .forms import NuevaClaveForm, RecuperarClaveForm

urlpatterns = [
    path('avisos/baja/<str:token>/', views.baja_avisos, name='baja_avisos'),
    path('ingresar/', views.login_view, name='login'),
    path('salir/', views.logout_view, name='logout'),
    path('registro/', views.registro_seleccion_view, name='registro_seleccion'),
    path('registro/<str:rol>/', views.registro_view, name='registro'),
    path('perfil/', views.perfil_view, name='perfil'),

    # Recuperar contraseña (las vistas de Django con nuestros templates; el email sale de RecuperarClaveForm)
    path('recuperar/', auth_views.PasswordResetView.as_view(
        form_class=RecuperarClaveForm,
        template_name='users/recuperar.html',
        success_url=reverse_lazy('recuperar_enviado'),
    ), name='recuperar'),
    path('recuperar/enviado/', auth_views.PasswordResetDoneView.as_view(
        template_name='users/recuperar_enviado.html',
    ), name='recuperar_enviado'),
    path('recuperar/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        form_class=NuevaClaveForm,
        template_name='users/recuperar_nueva.html',
        success_url=reverse_lazy('recuperar_listo'),
    ), name='recuperar_confirmar'),
    path('recuperar/listo/', auth_views.PasswordResetCompleteView.as_view(
        template_name='users/recuperar_listo.html',
    ), name='recuperar_listo'),
]
