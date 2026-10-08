from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib import messages
from .forms import RegistroUsuarioForm, CustomLoginForm

# VISTA DE REGISTRO
def register_view(request):
    if request.method == 'POST':
        # Instanciamos el formulario enviando los datos POST del usuario
        form = RegistroUsuarioForm(request.POST)
        
        if form.is_valid():
            usuario = form.save()  # Guarda en la base de datos db.sqlite3
            login(request, usuario)  # Autentica e inicia la sesión
            messages.success(request, f"¡Bienvenido/a {usuario.username}! Tu cuenta ha sido creada exitosamente.")
            
            # Redirige usando el NOMBRE de la ruta para evitar error 404
            return redirect('catalogo_productos')
        else:
            messages.error(request, "Error al crear la cuenta. Verifica que los datos sean correctos.")
    else:
        form = RegistroUsuarioForm()
    
    return render(request, 'users/register.html', {'form': form})

# VISTA DE INICIO DE SESIÓN
def login_view(request):
    if request.method == 'POST':
        form = CustomLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, f"¡Hola de nuevo, {user.username}!")
            return redirect('catalogo_productos')
        else:
            # Fallback en caso de login simple
            username_req = request.POST.get('username')
            password_req = request.POST.get('password')
            user = authenticate(request, username=username_req, password=password_req)
            if user is not None:
                login(request, user)
                return redirect('catalogo_productos')
            else:
                messages.error(request, "Usuario o contraseña incorrectos.")
    else:
        form = CustomLoginForm()
        
    return render(request, 'users/login.html', {'form': form})


# VISTA DE CIERRE DE SESIÓN
def logout_view(request):
    logout(request)
    messages.info(request, "Sesión cerrada correctamente.")
    return redirect('catalogo_productos')