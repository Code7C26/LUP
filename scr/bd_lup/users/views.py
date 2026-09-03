from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import redirect
from django.contrib.auth import logout
from .forms import RegistroUsuarioForm
from django.contrib.auth import login

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        user_type = request.POST.get('user_type', 'consumidor') # Lee cuál pestaña usó
        
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            
            # Redirección según el tipo de perfil al que ingrese
            if user_type == 'comercio':
                return redirect('/') # Redirigir a panel de comercio cuando lo tengas
            elif user_type == 'fundacion':
                return redirect('/') # Redirigir a panel de fundaciones
            else:
                return redirect('/productos/') # Los consumidores van a los productos
    else:
        form = AuthenticationForm()
        
    return render(request, 'users/login.html', {'form': form})


def register_view(request):
    if request.method == 'POST':
        form = RegistroUsuarioForm(request.POST)
        if form.is_valid():
            usuario = form.save()
            login(request, usuario)  # Inicia sesión automáticamente tras el registro
            return redirect('/')  # Redirige al Home
    else:
        form = RegistroUsuarioForm()
    
    return render(request, 'users/register.html', {'form': form})

def logout_view(request):
    logout(request)
    return redirect('/')