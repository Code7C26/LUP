from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.exceptions import PermissionDenied
from .models import Producto
from .forms import ProductoForm, ContactoOrganizacionForm


# ==========================================
# 1. GESTIÓN DE SESIÓN Y USUARIOS
# ==========================================

def login_view(request):
    if request.method == 'POST':
        username_req = request.POST.get('username')
        password_req = request.POST.get('password')

        # Autenticación directa por usuario y contraseña
        user = authenticate(request, username=username_req, password=password_req)

        if user is not None:
            login(request, user)
            messages.success(request, f"¡Bienvenido/a {user.username}!")
            return redirect('catalogo_productos')
        else:
            messages.error(request, "Usuario o contraseña incorrectos. Verifica los datos o registra una cuenta.")
    
    return render(request, 'users/login.html')


def logout_view(request):
    logout(request)
    messages.info(request, "Has cerrado sesión correctamente.")
    return redirect('catalogo_productos')


# ==========================================
# 2. CATÁLOGO Y EXCEDENTES (TODOS LOS ROLES)
# ==========================================

# VISTA PÚBLICA: Todos pueden ver los excedentes (Consumidores, Comercios, Organizaciones y Visitantes)
def catalogo_productos(request):
    productos = Producto.objects.all().order_by('-fecha_creacion')
    return render(request, 'catalogo_productos.html', {'productos': productos})


# VISTA RESTRINGIDA: Solo Comercios pueden subir excedentes
@login_required
def publicar_excedente(request):
    # Verificación estricta de permisos por rol
    if getattr(request.user, 'rol', None) != 'comercio':
        messages.error(request, "Acceso denegado. Únicamente los comercios pueden publicar excedentes.")
        return redirect('catalogo_productos')

    if request.method == 'POST':
        form = ProductoForm(request.POST, request.FILES)
        if form.is_valid():
            producto = form.save(commit=False)
            producto.comercio = request.user
            producto.save()
            messages.success(request, "¡Excedente publicado exitosamente!")
            return redirect('mi_perfil_comercio')
    else:
        form = ProductoForm()

    return render(request, 'publicar_excedente.html', {'form': form})


# PERFIL DE COMERCIO: Ver y administrar sus propias publicaciones
@login_required
def mi_perfil_comercio(request):
    if getattr(request.user, 'rol', None) != 'comercio':
        messages.error(request, "Solo los comercios tienen acceso al panel de gestión de publicaciones.")
        return redirect('catalogo_productos')

    mis_productos = Producto.objects.filter(comercio=request.user).order_by('-fecha_creacion')
    return render(request, 'perfil_comercio.html', {'productos': mis_productos})


# ELIMINAR EXCEDENTE: Solo el comercio propietario puede eliminarlo
@login_required
def eliminar_excedente(request, producto_id):
    producto = get_object_or_404(Producto, id=producto_id)
    
    if producto.comercio != request.user:
        messages.error(request, "No tienes permiso para eliminar este excedente.")
        return redirect('catalogo_productos')

    if request.method == 'POST':
        producto.delete()
        messages.success(request, "El producto ha sido eliminado correctamente.")
        return redirect('mi_perfil_comercio')

    return render(request, 'confirmar_eliminacion.html', {'producto': producto})


# CONTACTO ORGANIZACIONES CON LUP PARA SOLICITAR DONACIONES
@login_required
def solicitar_donacion_lup(request, producto_id):
    if getattr(request.user, 'rol', None) != 'organizacion':
        messages.error(request, "Esta sección es exclusiva para organizaciones registradas.")
        return redirect('catalogo_productos')

    producto = get_object_or_404(Producto, id=producto_id)

    if request.method == 'POST':
        form = ContactoOrganizacionForm(request.POST)
        if form.is_valid():
            messages.success(request, f"Tu solicitud de donación para '{producto.titulo}' fue enviada al equipo de LÜP. Nos pondremos en contacto a la brevedad.")
            return redirect('catalogo_productos')
    else:
        initial_data = {'asunto': f"Solicitud de Donación LÜP - Producto #{producto.id}: {producto.titulo}"}
        form = ContactoOrganizacionForm(initial=initial_data)

    return render(request, 'contacto_donacion.html', {'form': form, 'producto': producto})