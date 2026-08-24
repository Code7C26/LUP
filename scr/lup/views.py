from django.shortcuts import render
from stores.models import Tienda

def home(request):
    tiendas = Tienda.objects.all()
    return render(request, 'home.html', {'tiendas': tiendas})

