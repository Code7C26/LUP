from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import redirect
from django.contrib.auth import logout
from .forms import (
    RegistroUsuarioForm, 
    ConsumidorRegistroForm, 
    ComercioRegistroForm, 
    CustomLoginForm
)
from django.contrib.auth import login


def login_view(request):
    if request.method == 'POST':
        form = CustomLoginForm(request, data=request.POST)
        user_type = request.POST.get('user_type', 'consumidor')
        
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            
            if user.is_comercio() or user_type == 'comercio':
                return redirect('/comercio/panel/')
            elif user.is_organizacion() or user_type == 'fundacion':
                return redirect('/fundacion/panel/')
            else:
                return redirect('/productos/')
    else:
        form = CustomLoginForm()
        
    return render(request, 'users/login.html', {'form': form})


def register_view(request):
    if request.method == 'POST':
        form = RegistroUsuarioForm(request.POST)
        if form.is_valid():
            usuario = form.save()
            login(request, usuario)
            return redirect('/')
    else:
        form = RegistroUsuarioForm()
    
    return render(request, 'users/register.html', {'form': form})


def logout_view(request):
    logout(request)
    return redirect('/')


# Vistas para los registros específicos
def registro_seleccion_view(request):
    return render(request, 'users/registro_seleccion.html')


def registro_consumidor_view(request):
    if request.method == 'POST':
        form = ConsumidorRegistroForm(request.POST)
        if form.is_valid():
            usuario = form.save()
            login(request, usuario)
            return redirect('/productos/')
    else:
        form = ConsumidorRegistroForm()
    return render(request, 'users/registro_consumidor.html', {'form': form})


def registro_comercio_view(request):
    if request.method == 'POST':
        form = ComercioRegistroForm(request.POST)
        if form.is_valid():
            usuario = form.save()
            login(request, usuario)
            return redirect('/comercio/panel/')
    else:
        form = ComercioRegistroForm()
    return render(request, 'users/registro_comercio.html', {'form': form})