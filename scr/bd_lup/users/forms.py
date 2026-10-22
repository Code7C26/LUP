import re
from io import BytesIO

from django import forms
from django.core.files.base import ContentFile
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.db import transaction

from scr.bd_lup.stores.models import Tienda

from .models import Organizacion, Usuario


class EstiloBootstrapMixin:
    """Agrega las clases de Bootstrap a todos los campos del formulario."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for campo in self.fields.values():
            widget = campo.widget
            if isinstance(widget, forms.CheckboxInput):
                widget.attrs.setdefault('class', 'form-check-input')
            elif isinstance(widget, forms.Select):
                widget.attrs.setdefault('class', 'form-select')
            else:
                widget.attrs.setdefault('class', 'form-control')
            if campo.help_text and 'placeholder' not in widget.attrs:
                widget.attrs['placeholder'] = campo.help_text


def validar_cuit(valor):
    digitos = re.sub(r'\D', '', valor or '')
    if len(digitos) != 11:
        raise forms.ValidationError('El CUIT/CUIL debe tener 11 dígitos.')
    return f'{digitos[:2]}-{digitos[2:10]}-{digitos[10]}'


class RegistroBaseForm(EstiloBootstrapMixin, UserCreationForm):
    rol = None
    acepta_terminos = forms.BooleanField(
        label='Acepto los términos y condiciones de Lüp',
        error_messages={'required': 'Tenés que aceptar los términos para continuar.'},
    )

    class Meta(UserCreationForm.Meta):
        model = Usuario
        fields = ('username', 'first_name', 'last_name', 'email', 'telefono', 'ciudad')
        labels = {'first_name': 'Nombre', 'last_name': 'Apellido'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].required = True
        self.fields['username'].help_text = ''
        self.fields['username'].widget.attrs['placeholder'] = 'ej: juan_perez'
        self.fields['email'].widget.attrs['placeholder'] = 'tu@email.com'
        self.fields['telefono'].widget.attrs['placeholder'] = '351 555 1234'
        self.fields['ciudad'].widget.attrs['placeholder'] = 'Ej: Alta Gracia'
        self.fields['password1'].help_text = 'Mínimo 8 caracteres, no solo números.'
        self.fields['password2'].help_text = ''

    def clean_email(self):
        email = self.cleaned_data['email'].lower().strip()
        if Usuario.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError('Ya existe una cuenta con este email.')
        return email

    def guardar_perfil(self, usuario):
        """Las subclases crean aquí el perfil asociado al rol."""

    @transaction.atomic
    def save(self, commit=True):
        usuario = super().save(commit=False)
        usuario.rol = self.rol
        usuario.save()
        self.guardar_perfil(usuario)
        return usuario


class ConsumidorRegistroForm(RegistroBaseForm):
    rol = Usuario.CONSUMIDOR


class ComercioRegistroForm(RegistroBaseForm):
    rol = Usuario.COMERCIO

    nombre_fantasia = forms.CharField(label='Nombre del comercio', max_length=100)
    rubro = forms.ChoiceField(choices=Tienda.RUBROS)
    cuit = forms.CharField(label='CUIT / CUIL', max_length=13, help_text='20-12345678-9')
    direccion = forms.CharField(label='Dirección del local', max_length=200, help_text='Calle, número y ciudad')
    horario_atencion = forms.CharField(
        label='Horario de retiro', max_length=100, help_text='Ej: Lun a Sáb de 18 a 20 hs'
    )

    class Meta(RegistroBaseForm.Meta):
        labels = {'first_name': 'Nombre del responsable', 'last_name': 'Apellido del responsable'}

    def clean_cuit(self):
        cuit = validar_cuit(self.cleaned_data['cuit'])
        if Tienda.objects.filter(cuit=cuit).exists():
            raise forms.ValidationError('Ya hay un comercio registrado con este CUIT.')
        return cuit

    def guardar_perfil(self, usuario):
        Tienda.objects.create(
            usuario=usuario,
            nombre_fantasia=self.cleaned_data['nombre_fantasia'],
            rubro=self.cleaned_data['rubro'],
            cuit=self.cleaned_data['cuit'],
            direccion=self.cleaned_data['direccion'],
            horario_atencion=self.cleaned_data['horario_atencion'],
        )


class OrganizacionRegistroForm(RegistroBaseForm):
    rol = Usuario.ORGANIZACION

    nombre_organizacion = forms.CharField(label='Nombre de la organización', max_length=150)
    tipo = forms.ChoiceField(label='Tipo de organización', choices=Organizacion.TIPOS)
    cuit = forms.CharField(label='CUIT / matrícula', max_length=13, help_text='30-12345678-9')
    direccion = forms.CharField(label='Dirección', max_length=255, help_text='Calle, número y ciudad')
    personas_asistidas = forms.IntegerField(label='Personas asistidas por semana', min_value=0, initial=0)

    class Meta(RegistroBaseForm.Meta):
        labels = {'first_name': 'Nombre del referente', 'last_name': 'Apellido del referente'}

    def clean_cuit(self):
        cuit = validar_cuit(self.cleaned_data['cuit'])
        if Organizacion.objects.filter(cuit=cuit).exists():
            raise forms.ValidationError('Ya hay una organización registrada con este CUIT.')
        return cuit

    def guardar_perfil(self, usuario):
        Organizacion.objects.create(
            usuario=usuario,
            nombre=self.cleaned_data['nombre_organizacion'],
            tipo=self.cleaned_data['tipo'],
            cuit=self.cleaned_data['cuit'],
            direccion=self.cleaned_data['direccion'],
            personas_asistidas=self.cleaned_data['personas_asistidas'],
        )


FORMULARIOS_REGISTRO = {
    Usuario.CONSUMIDOR: ConsumidorRegistroForm,
    Usuario.COMERCIO: ComercioRegistroForm,
    Usuario.ORGANIZACION: OrganizacionRegistroForm,
}


class LoginForm(EstiloBootstrapMixin, AuthenticationForm):
    """Login único con usuario o email. El rol elegido se verifica contra la cuenta."""

    rol = forms.ChoiceField(choices=Usuario.ROLES, widget=forms.HiddenInput, required=False)

    error_messages = {
        **AuthenticationForm.error_messages,
        'invalid_login': 'Usuario/email o contraseña incorrectos.',
        'rol_incorrecto': 'Esta cuenta está registrada como %(rol)s. Elegí esa pestaña para ingresar.',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].label = 'Usuario o email'
        self.fields['username'].widget.attrs['placeholder'] = 'tu_usuario o tu@email.com'
        self.fields['password'].widget.attrs['placeholder'] = '••••••••'

    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        rol = self.cleaned_data.get('rol')
        if rol and user.rol != rol and not user.is_superuser:
            raise forms.ValidationError(
                self.error_messages['rol_incorrecto'],
                code='rol_incorrecto',
                params={'rol': user.get_rol_display()},
            )


FOTO_TAMANO_MAX_MB = 5
FOTO_LADO_PX = 400  # las fotos se recortan en un cuadrado de 400×400


def procesar_foto_perfil(archivo):
    """Recorta la imagen en un cuadrado centrado y la achica, para que pese poco.

    Devuelve un ContentFile listo para asignar al ImageField.
    """
    from PIL import Image, ImageOps

    archivo.seek(0)
    imagen = Image.open(archivo)
    imagen = ImageOps.exif_transpose(imagen)  # respeta la orientación de las fotos del celular
    tiene_transparencia = imagen.mode in ('RGBA', 'LA') or (imagen.mode == 'P' and 'transparency' in imagen.info)
    imagen = imagen.convert('RGBA' if tiene_transparencia else 'RGB')
    imagen = ImageOps.fit(imagen, (FOTO_LADO_PX, FOTO_LADO_PX), method=Image.Resampling.LANCZOS)

    salida = BytesIO()
    if tiene_transparencia:  # logos con fondo transparente
        imagen.save(salida, format='PNG', optimize=True)
        extension = 'png'
    else:
        imagen.save(salida, format='JPEG', quality=88, optimize=True)
        extension = 'jpg'
    return ContentFile(salida.getvalue(), name=f'perfil.{extension}')


class PerfilUsuarioForm(EstiloBootstrapMixin, forms.ModelForm):
    quitar_foto = forms.BooleanField(required=False, label='Quitar foto actual')

    class Meta:
        model = Usuario
        fields = ('foto', 'first_name', 'last_name', 'email', 'telefono', 'ciudad')
        labels = {'first_name': 'Nombre', 'last_name': 'Apellido'}
        widgets = {'foto': forms.FileInput(attrs={'accept': 'image/jpeg,image/png,image/webp'})}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.foto_anterior = self.instance.foto.name if self.instance.foto else ''

    def clean_email(self):
        email = self.cleaned_data['email'].lower().strip()
        if Usuario.objects.filter(email__iexact=email).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError('Ya existe una cuenta con este email.')
        return email

    def clean_foto(self):
        foto = self.cleaned_data.get('foto')
        es_nueva = foto and hasattr(foto, 'content_type')
        if es_nueva and foto.size > FOTO_TAMANO_MAX_MB * 1024 * 1024:
            raise forms.ValidationError(f'La foto no puede pesar más de {FOTO_TAMANO_MAX_MB} MB.')
        return foto

    def save(self, commit=True):
        usuario = super().save(commit=False)
        foto_subida = self.files.get(self.add_prefix('foto'))

        if foto_subida:
            contenido = procesar_foto_perfil(foto_subida)
            usuario.foto.save(contenido.name, contenido, save=False)
        elif self.cleaned_data.get('quitar_foto'):
            usuario.foto = None

        if commit:
            usuario.save()
            self._borrar_foto_anterior(usuario)
        return usuario

    def _borrar_foto_anterior(self, usuario):
        """Si la foto se reemplazó o se quitó, borra el archivo viejo del disco."""
        actual = usuario.foto.name if usuario.foto else ''
        if self.foto_anterior and self.foto_anterior != actual:
            usuario.foto.storage.delete(self.foto_anterior)


class TiendaForm(EstiloBootstrapMixin, forms.ModelForm):
    class Meta:
        model = Tienda
        fields = ('nombre_fantasia', 'rubro', 'descripcion', 'direccion', 'horario_atencion')
        widgets = {'descripcion': forms.Textarea(attrs={'rows': 3})}


class OrganizacionForm(EstiloBootstrapMixin, forms.ModelForm):
    class Meta:
        model = Organizacion
        fields = ('nombre', 'tipo', 'direccion', 'personeria_juridica', 'personas_asistidas')
