# App para celular de Lüp

App de Lüp hecha con **React Native + Expo (SDK 58)**. Usa la API de Django de este mismo repositorio (`/api/...`).

## Cómo correrla

```bash
cd app
npm install
npx expo start
```

1. Instalá **Expo Go** en el celular y escaneá el QR.
2. En otra terminal, desde la carpeta `LUP`, corré Django escuchando en la red: `python manage.py runserver 0.0.0.0:8000`.
3. El celular y la compu tienen que estar en la misma red Wi-Fi. Si no conecta, creá `app/.env` con
   `EXPO_PUBLIC_URL_SERVIDOR=http://IP-DE-TU-COMPU:8000` y reiniciá Expo.

Cuentas de prueba (después de `python manage.py cargar_demo`): `consumidor_demo`, `panaderia_sol` y `comedor_demo`, clave `LupDemo2026!`.

## Carpetas

- `src/api/` cliente de la API · `src/contexto/` sesión, carrito, favoritos y tema
- `src/navegacion/` pantallas según el tipo de cuenta · `src/pantallas/` todas las pantallas
- `src/servicios/` notificaciones push y recordatorios · `assets/` logo, íconos y video de la intro

Más información en el [README principal](../README.md).
