from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from .models import Producto
from .forms import ProductoForm
from scr.bd_lup.stores.models import Tienda  # <-- Importación corregida aquí

def lista_productos(request):
    productos = Producto.objects.filter(estado='DISPONIBLE')
    return render(request, 'catalogo_productos.html', {'productos': productos})

@login_required
def publicar_excedente(request):
    tienda = Tienda.objects.filter(usuario=request.user).first()
    if not tienda:
        tienda = Tienda.objects.first()

    if request.method == 'POST':
        form = ProductoForm(request.POST, request.FILES)
        if form.is_valid():
            producto = form.save(commit=False)
            producto.comercio = tienda
            producto.estado = 'DISPONIBLE'
            producto.save()
            return redirect('catalogo')
    else:
        form = ProductoForm()

    return render(request, 'crear_producto.html', {'form': form})