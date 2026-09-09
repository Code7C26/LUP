from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from scr.bd_lup.users.models import Usuario, Comercio


# 1. Formulario Base (El que ya tenías)
class RegistroUsuarioForm(UserCreationForm):
    class Meta:
        model = Usuario
        fields = ['username', 'email', 'rol', 'telefono']


# 2. Formulario para Consumidores
class ConsumidorRegistroForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = Usuario
        fields = ('username', 'first_name', 'last_name', 'email', 'telefono')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.rol = 'consumidor'
        if commit:
            user.save()
        return user


# 3. Formulario para Comercios Asociados (Crea el modelo Comercio en simultáneo)
class ComercioRegistroForm(UserCreationForm):
    nombre_comercio = forms.CharField(max_length=150, label="Nombre del Comercio")
    cuit_cuil = forms.CharField(max_length=13, label="CUIT / CUIL")
    direccion = forms.CharField(max_length=255, label="Dirección Comercial")
    rubro = forms.CharField(max_length=100, label="Rubro")
    horario_atencion = forms.CharField(max_length=100, label="Horario de Retiro")

    class Meta(UserCreationForm.Meta):
        model = Usuario
        fields = ('username', 'email', 'telefono')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.rol = 'comercio'
        if commit:
            user.save()
            Comercio.objects.create(
                usuario=user,
                nombre_comercio=self.cleaned_data['nombre_comercio'],
                cuit_cuil=self.cleaned_data['cuit_cuil'],
                direccion=self.cleaned_data['direccion'],
                rubro=self.cleaned_data['rubro'],
                horario_atencion=self.cleaned_data['horario_atencion']
            )
        return user


# 4. Formulario de Login Único
class CustomLoginForm(AuthenticationForm):
    username = forms.CharField(
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Usuario o Email'})
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Contraseña'})
    )
