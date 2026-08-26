from django import forms
from django.contrib.auth.forms import UserCreationForm
from scr.bd_lup.users.models import Usuario

class RegistroUsuarioForm(UserCreationForm):
    class Meta:
        model = Usuario
        fields = ['username', 'email', 'rol', 'telefono']
