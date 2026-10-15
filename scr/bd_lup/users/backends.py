from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class UsuarioOEmailBackend(ModelBackend):
    """Permite iniciar sesión con el nombre de usuario o con el email."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        Usuario = get_user_model()
        campo = 'email__iexact' if '@' in username else 'username__iexact'
        usuario = Usuario.objects.filter(**{campo: username.strip()}).first()
        if usuario is None:
            # Mitiga ataques de tiempo ejecutando el hasher igualmente
            Usuario().set_password(password)
            return None
        if usuario.check_password(password) and self.user_can_authenticate(usuario):
            return usuario
        return None
