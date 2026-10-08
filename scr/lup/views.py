from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django import forms

# 1. IMPORTACIÓN DEL MODELO Y FORMULARIO DE PRODUCTO
from scr.bd_lup.products.models import Producto
from scr.bd_lup.products.forms import ProductoForm

def home(request):
    return render(request, 'home.html')

# Formulario sencillo para coordinar la donación con LÜP
class ContactoOrganizacionForm(forms.Form):
    asunto = forms.CharField(
        max_length=150, 
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Asunto de la solicitud'})
    )
    mensaje = forms.CharField(
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'placeholder': 'Escribe tu mensaje para coordinar la entrega...'})
    )


# ==========================================
# 1. AUTENTICACIÓN Y SESIÓN
# ==========================================

def login_view(request):
    if request.method == 'POST':
        username_req = request.POST.get('username')
        password_req = request.POST.get('password')

        user = authenticate(request, username=username_req, password=password_req)

        if user is not None:
            login(request, user)
            messages.success(request, f"¡Bienvenido/a {user.username}!")
            return redirect('catalogo_productos')
        else:
            messages.error(request, "Usuario o contraseña incorrectos.")
    
    return render(request, 'users/login.html')


def logout_view(request):
    logout(request)
    messages.info(request, "Has cerrado sesión correctamente.")
    return redirect('catalogo_productos')


# ==========================================
# 2. CATÁLOGO Y GESTIÓN DE EXCEDENTES
# ==========================================

# VISTA PÚBLICA PRINCIPAL
def catalogo_productos(request):
    # Cambiamos '-fecha_creacion' por '-creado_en'
    productos = Producto.objects.all().order_by('-creado_en')
    return render(request, 'catalogo_productos.html', {'productos': productos})


# PUBLICAR EXCEDENTE (SOLO COMERCIOS)
@login_required
def publicar_excedente(request):
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


# PERFIL Y GESTIÓN DEL COMERCIO
@login_required
def mi_perfil_comercio(request):
    if getattr(request.user, 'rol', None) != 'comercio':
        messages.error(request, "Acceso exclusivo para comercios.")
        return redirect('catalogo_productos')

    mis_productos = Producto.objects.filter(comercio=request.user).order_by('-creado_en')
    return render(request, 'perfil_comercio.html', {'productos': mis_productos})


# ELIMINAR EXCEDENTE
@login_required
def eliminar_excedente(request, producto_id):
    producto = get_object_or_404(Producto, id=producto_id)
    
    if producto.comercio != request.user:
        messages.error(request, "No tienes permiso para eliminar este producto.")
        return redirect('catalogo_productos')

    if request.method == 'POST':
        producto.delete()
        messages.success(request, "Producto eliminado correctamente.")
        return redirect('mi_perfil_comercio')

    return render(request, 'confirmar_eliminacion.html', {'producto': producto})


# DONACIONES PARA ORGANIZACIONES
@login_required
def solicitar_donacion_lup(request, producto_id):
    if getattr(request.user, 'rol', None) != 'organizacion':
        messages.error(request, "Acceso exclusivo para organizaciones registradas.")
        return redirect('catalogo_productos')

    producto = get_object_or_404(Producto, id=producto_id)

    if request.method == 'POST':
        form = ContactoOrganizacionForm(request.POST)
        if form.is_valid():
            messages.success(request, f"Solicitud para '{producto.titulo}' enviada a LÜP.")
            return redirect('catalogo_productos')
    else:
        initial_data = {'asunto': f"Solicitud Donación LÜP - Producto #{producto.id}: {producto.titulo}"}
        form = ContactoOrganizacionForm(initial=initial_data)

    return render(request, 'contacto_donacion.html', {'form': form, 'producto': producto})