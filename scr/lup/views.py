from django.shortcuts import render
from scr.bd_lup.stores.models import Tienda

def home(request):
    tiendas = Tienda.objects.all()
    return render(request, 'home.html', {'tiendas': tiendas})