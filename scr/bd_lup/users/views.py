from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib import messages
from django.contrib.auth.models import User

# Intentamos importar los formularios correspondientes
try:
    from .forms import (
        RegistroUsuarioForm, 
        ConsumidorRegistroForm, 
        ComercioRegistroForm, 
        CustomLoginForm
    )
except ImportError:
    from scr.bd_lup.users.forms import (
        RegistroUsuarioForm, 
        ConsumidorRegistroForm, 
        ComercioRegistroForm, 
        CustomLoginForm
    )


# ==========================================
# 1. AUTENTICACIÓN Y SESIÓN
# ==========================================

def login_view(request):
    if request.method == 'POST':
        form = CustomLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, f"¡Hola de nuevo, {user.username}!")
            return redirect('catalogo_productos')
        else:
            # Fallback que permite ingresar tanto por Nombre de usuario como por Email
            login_input = request.POST.get('username')
            password_req = request.POST.get('password')
            
            # Buscar si el dato ingresado corresponde a un email o usuario
            user_obj = User.objects.filter(email__iexact=login_input).first() or \
                       User.objects.filter(username__iexact=login_input).first()
            
            if user_obj:
                user = authenticate(request, username=user_obj.username, password=password_req)
                if user is not None:
                    login(request, user)
                    messages.success(request, f"¡Bienvenido/a {user.username}!")
                    return redirect('catalogo_productos')
            
            messages.error(request, "Usuario o contraseña incorrectos.")
    else:
        form = CustomLoginForm()
        
    return render(request, 'users/login.html', {'form': form})


def logout_view(request):
    logout(request)
    messages.info(request, "Sesión cerrada correctamente.")
    return redirect('catalogo_productos')


# ==========================================
# 2. SELECCIÓN Y REGISTRO DE USUARIOS
# ==========================================

# Vista intermedia para elegir tipo de perfil (Consumidor / Comercio / Organización)
def registro_seleccion_view(request):
    return render(request, 'users/registro_seleccion.html')


# Registro General / Predeterminado
def register_view(request):
    if request.method == 'POST':
        form = RegistroUsuarioForm(request.POST)
        if form.is_valid():
            # 1. Creamos la instancia sin guardar en la DB todavía
            usuario = form.save(commit=False)
            
            # 2. Encriptamos explícitamente la contraseña ingresada
            raw_password = form.cleaned_data.get('password') or request.POST.get('password')
            if raw_password:
                usuario.set_password(raw_password)
            
            # 3. Guardamos definitivamente en db.sqlite3
            usuario.save()

            # 4. Forzamos el inicio de sesión con el backend estándar de Django
            login(request, usuario, backend='django.contrib.auth.backends.ModelBackend')
            
            messages.success(request, f"¡Bienvenido/a {usuario.username}! Tu cuenta ha sido creada exitosamente.")
            return redirect('catalogo_productos')
        else:
            # Mostramos los errores específicos directamente en la pantalla
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"Error en {field}: {error}")
    else:
        form = RegistroUsuarioForm()
    
    return render(request, 'users/register.html', {'form': form})


# Registro específico para Consumidores
def registro_consumidor_view(request):
    if request.method == 'POST':
        form = ConsumidorRegistroForm(request.POST) if 'ConsumidorRegistroForm' in globals() else RegistroUsuarioForm(request.POST)
        if form.is_valid():
            usuario = form.save(commit=False)
            raw_password = form.cleaned_data.get('password') or request.POST.get('password')
            if raw_password:
                usuario.set_password(raw_password)
            usuario.save()

            login(request, usuario, backend='django.contrib.auth.backends.ModelBackend')
            messages.success(request, "¡Cuenta de Consumidor creada exitosamente!")
            return redirect('catalogo_productos')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"Error en {field}: {error}")
    else:
        form = ConsumidorRegistroForm() if 'ConsumidorRegistroForm' in globals() else RegistroUsuarioForm()
        
    return render(request, 'users/registro_consumidor.html', {'form': form})


# Registro específico para Comercios
def registro_comercio_view(request):
    if request.method == 'POST':
        form = ComercioRegistroForm(request.POST) if 'ComercioRegistroForm' in globals() else RegistroUsuarioForm(request.POST)
        if form.is_valid():
            usuario = form.save(commit=False)
            raw_password = form.cleaned_data.get('password') or request.POST.get('password')
            if raw_password:
                usuario.set_password(raw_password)
            usuario.save()

            login(request, usuario, backend='django.contrib.auth.backends.ModelBackend')
            messages.success(request, "¡Comercio registrado exitosamente!")
            return redirect('catalogo_productos')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"Error en {field}: {error}")
    else:
        form = ComercioRegistroForm() if 'ComercioRegistroForm' in globals() else RegistroUsuarioForm()
        
    return render(request, 'users/registro_comercio.html', {'form': form})