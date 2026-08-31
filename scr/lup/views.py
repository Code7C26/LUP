from django.shortcuts import render

# Vista principal simplificada
def home(request):
    return render(request, 'home.html')