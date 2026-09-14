from django import forms
from .models import Producto

class ProductoForm(forms.ModelForm):
    class Meta:
        model = Producto
        fields = [
            'titulo', 
            'descripcion', 
            'precio_original', 
            'precio_descuento', 
            'stock', 
            'fecha_vencimiento', 
            'es_donacion', 
            'imagen'
        ]
        widgets = {
            'titulo': forms.TextInput(attrs={
                'class': 'form-control rounded-3',
                'placeholder': 'Ej: Docena de medialunas o Bolsa sorpresa panadería'
            }),
            'descripcion': forms.Textarea(attrs={
                'class': 'form-control rounded-3', 
                'rows': 3,
                'placeholder': 'Describe brevemente los alimentos incluidos en esta oferta...'
            }),
            'precio_original': forms.NumberInput(attrs={
                'class': 'form-control rounded-3', 
                'step': '0.01',
                'placeholder': '0.00'
            }),
            'precio_descuento': forms.NumberInput(attrs={
                'class': 'form-control rounded-3', 
                'step': '0.01',
                'placeholder': '0.00'
            }),
            'stock': forms.NumberInput(attrs={
                'class': 'form-control rounded-3', 
                'min': '1'
            }),
            'fecha_vencimiento': forms.DateInput(attrs={
                'class': 'form-control rounded-3', 
                'type': 'date'
            }),
            'es_donacion': forms.CheckboxInput(attrs={
                'class': 'form-check-input ms-2'
            }),
            'imagen': forms.FileInput(attrs={
                'class': 'form-control rounded-3'
            }),
        }
        labels = {
            'titulo': 'Título de la oferta',
            'descripcion': 'Descripción detallada',
            'precio_original': 'Precio Original ($)',
            'precio_descuento': 'Precio de Oferta Lüp ($)',
            'stock': 'Unidades disponibles',
            'fecha_vencimiento': 'Fecha de vencimiento / Límite de retiro',
            'es_donacion': '¿Es una oferta destinada a donación?',
            'imagen': 'Fotografía del producto (JPG/PNG)'
        }