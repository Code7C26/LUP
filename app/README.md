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

## Armar el APK (EAS)

Perfiles en `eas.json`: `preview` arma un **APK** para instalar directo; `production` arma el **AAB** para Google Play.
Los dos usan la web publicada (`EXPO_PUBLIC_URL_SERVIDOR=https://lupalimentos.com`).

Las claves NO están en el repo: son variables de EAS que lee `app.config.js`.

| Variable | Tipo | Para qué |
|---|---|---|
| `EXPO_PUBLIC_URL_SERVIDOR` | texto, `plaintext` | La web (también la usan los `eas update`, que NO leen el `env` de `eas.json`) |
| `GOOGLE_MAPS_API_KEY` | texto, `sensitive` | Mapas en Android (sin ella, el mapa cierra la app) |
| `GOOGLE_SERVICES_JSON` | archivo, `secret` | Notificaciones push (Firebase) |

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_URL_SERVIDOR --value https://lupalimentos.com --environment preview --environment production --visibility plaintext
npx eas-cli@latest env:set --name GOOGLE_MAPS_API_KEY --value "LA_CLAVE" --environment preview --environment production --visibility sensitive
npx eas-cli@latest env:set --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment preview --environment production --visibility secret
npx eas-cli@latest build -p android --profile preview
```

Cambios solo de JavaScript (pantallas, textos), sin reinstalar: `npx eas-cli@latest update --channel preview --environment preview --message "..."`.
Si se agrega una librería nativa o cambia `app.json`, hay que subir `version` y armar un APK nuevo.
`google-services.json` y la clave de servicio de Firebase están en `.gitignore`: no se suben.

Más información en el [README principal](../README.md).
