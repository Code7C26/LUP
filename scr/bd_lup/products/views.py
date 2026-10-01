from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Producto
from .forms import ProductoForm
from scr.bd_lup.stores.models import Tienda


def lista_productos(request):
    productos = Producto.objects.filter(estado='DISPONIBLE').order_by('-creado_en')
    return render(request, 'catalogo_productos.html', {'productos': productos})


@login_required
def publicar_excedente(request):
    # 1. Obtiene la tienda vinculada al usuario o la crea en el acto si no existe
    tienda = Tienda.objects.filter(usuario=request.user).first()
    if not tienda:
        tienda = Tienda.objects.create(
            usuario=request.user, 
        )

    # 2. Procesa la carga del formulario enviada por el cliente desde la web
    if request.method == 'POST':
        form = ProductoForm(request.POST, request.FILES)
        if form.is_valid():
            producto = form.save(commit=False)
            producto.comercio = tienda
            producto.estado = 'DISPONIBLE'
            producto.save()
            messages.success(request, "¡Excedente publicado exitosamente!")
            # Redirige al menú/catálogo de productos tras hacer clic en "Publicar Oferta"
            return redirect('catalogo')
    else:
        form = ProductoForm()

    # 3. Renderiza la pantalla del formulario web
    return render(request, 'crear_producto.html', {'form': form})