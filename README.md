<p align="center">
  <img src="jpg/doc_assets/readme/banner.png" alt="Lüp · Una segunda oportunidad para cada alimento" width="100%">
</p>

<img src="jpg/doc_assets/readme/t_proba.png" alt="Probá Lüp" height="44">

- **Página web:** [www.lupalimentos.com](https://www.lupalimentos.com)
- **App para Android:** entrá a la web desde el celular y tocá **Descargar la app**
- **Manual de usuario:** [Manual de usuario.pdf](doc/Pdf/Manuales%20-%20de%20empresa/Manual%20de%20usuario.pdf)
- **Instagram:** [@lupalimentos](https://www.instagram.com/lupalimentos)

<img src="jpg/doc_assets/readme/t_que.png" alt="¿Qué es Lüp?" height="44">

En Argentina se desperdician cerca de **16 millones de toneladas de alimentos por año**, y muchos todavía están en buen estado. Lüp conecta a los comercios que tienen comida sin vender con personas que la compran con descuento y con organizaciones sociales que la reciben como donación. Así, el comercio recupera parte de lo que invirtió, más gente accede a comida a menor precio y se tira menos.

<img src="jpg/doc_assets/readme/t_como.png" alt="¿Cómo funciona?" height="44">

<img src="jpg/doc_assets/readme/como.png" alt="Cómo funciona Lüp" width="100%">

<img src="jpg/doc_assets/readme/t_func.png" alt="Qué puede hacer cada usuario" height="44">

<img src="jpg/doc_assets/readme/usuarios.png" alt="Funciones para consumidor, comercio y organización" width="100%">

La web y la app comparten el mismo servidor, y las dos tienen **chat de ayuda con IA ("Lü")**, notificaciones, modo oscuro y versión en inglés.

<img src="jpg/doc_assets/readme/t_tec.png" alt="Tecnologías" height="44">

| | |
|---|---|
| **Servidor y web** | Python · Django · Django REST Framework |
| **App** | React Native · Expo · notificaciones con Firebase |
| **Base de datos** | PostgreSQL |
| **Inteligencia artificial** | Claude (Anthropic): chat de ayuda y productos a partir de una foto |
| **Publicación** | Render · Cloudflare · APK con EAS |
| **Organización** | GitHub con ramas por integrante, Pull Requests y GitHub Projects |

<img src="jpg/doc_assets/readme/t_equipo.png" alt="Equipo" height="44">

<img src="jpg/doc_assets/readme/equipo.png" alt="Equipo de Lüp" width="100%">

<img src="jpg/doc_assets/readme/t_docs.png" alt="Documentación" height="44">

Toda la documentación del proyecto está en [`doc/`](doc/), en Word y en PDF: análisis FODA, costos y monetización, punto de equilibrio, dimensión del mercado, estrategias de adquisición, pasos legales, [mockup](doc/Pdf/Dise%C3%B1o/Mock%20up.pdf), lluvia de ideas, propuesta de valor, testing y [manual de usuario](doc/Pdf/Manuales%20-%20de%20empresa/Manual%20de%20usuario.pdf).

**Próximos pasos:** publicar la app en Google Play, sumar el pago online con Mercado Pago y sumar los primeros comercios de Alta Gracia.

<img src="jpg/doc_assets/readme/t_dev.png" alt="Para desarrolladores" height="44">

Tocá cada sección para abrirla.

<details>
<summary><b>Cómo ejecutarlo en la compu</b></summary>

### 1. Página web y API (carpeta `LUP`)

```bash
git clone https://github.com/Code7C26/LUP.git
cd LUP
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # opcional: acceso a /admin
python manage.py runserver
```

Abrí http://127.0.0.1:8000.

### 2. App para celular (carpeta `LUP/app`)

Necesitás Node.js y la app **Expo Go** en el celular (o un emulador de Android).

```bash
cd app
npm install
npx expo start
```

Escaneá el código QR con Expo Go. El celular y la compu tienen que estar en la **misma red Wi-Fi**,
y Django tiene que correr escuchando en la red:

```bash
python manage.py runserver 0.0.0.0:8000
```

La app busca el servidor sola en la misma compu que corre Expo. Para usar otro servidor, creá `app/.env` con
`EXPO_PUBLIC_URL_SERVIDOR=http://IP-DE-TU-COMPU:8000`.

### Datos de muestra (solo para desarrollo)

`python manage.py cargar_demo` crea comercios, ofertas, reservas y opiniones **inventadas** para probar
(usuarios `panaderia_sol`, `consumidor_demo` y `comedor_demo`, clave `LupDemo2026!`). No funciona con `DEBUG=0`.

**Antes de presentar o publicar la página**, borrá todo lo de muestra (solo toca las cuentas `@lup.demo`):

```bash
python manage.py limpiar_demo
```

</details>

<details>
<summary><b>Estructura de carpetas</b></summary>

```text
LUP/
├── .gitignore
├── README.md
├── requirements.txt
├── manage.py
│
├── scr/                          <-- 🌐 CÓDIGO FUENTE DE LA PÁGINA WEB
│   ├── lup/                      <-- Configuración principal de Django (settings, urls)
│   ├── bd_lup/                   <-- Aplicaciones internas
│   │   ├── users/                <-- Usuario personalizado, organizaciones, login y registro
│   │   ├── stores/               <-- Perfil de comercio (Tienda)
│   │   ├── products/             <-- Productos, reservas, donaciones, API, IA de fotos y paneles
│   │   ├── puntos/               <-- Puntos Lüp y canje de merch
│   │   └── soporte/              <-- Chat de ayuda "Lü"
│   ├── descargas/                <-- APK de Android que se descarga desde la web
│   ├── templates/                <-- Plantillas HTML
│   └── static/                   <-- CSS, JS e imágenes de la web
│
├── app/                          <-- 📱 APP PARA CELULAR (React Native + Expo)
│   ├── App.js                    <-- Punto de entrada (fuentes, tema, navegación)
│   ├── app.json                  <-- Configuración de Expo / EAS (nombre, íconos, permisos)
│   ├── assets/                   <-- Logo, íconos, video de la intro
│   └── src/
│       ├── api/                  <-- Cliente de la API de Django
│       ├── componentes/          <-- Botones, campos, tarjetas, íconos
│       ├── contexto/             <-- Sesión, carrito, favoritos, tema claro/oscuro
│       ├── navegacion/           <-- Pantallas y pestañas según el tipo de cuenta
│       ├── pantallas/            <-- Inicio, catálogo, mapa, carrito, reservas, perfil…
│       │   ├── comercio/         <-- Mis productos, publicar, confirmar retiro, solicitudes
│       │   └── organizacion/     <-- Donaciones disponibles y mis solicitudes
│       └── servicios/            <-- Notificaciones push y recordatorios de retiro
│
├── doc/                          <-- 📄 DOCUMENTACIÓN DEL PROYECTO (en Word y en PDF)
│   ├── Pdf/ y Word/
│   │   ├── Comercio/             <-- FODA, costos, break even, mercado, estrategias de adquisición
│   │   ├── Diseño/               <-- Mockup y guía de merch
│   │   ├── Legales/              <-- Pasos legales y propiedad intelectual
│   │   └── Manuales - de empresa/ <-- Manual de usuario, lluvia de ideas, propuesta de valor, testing
│   └── Excel/                    <-- Planilla de testing cruzado
│
├── jpg/                          <-- 🖼️ IMÁGENES DE DOCUMENTACIÓN
│   ├── diseño/                   <-- Logo, sublogo, merch, stickers y logos adicionales
│   ├── doc_assets/               <-- Íconos usados en este README
│   ├── comercio/                 <-- Gráfico FODA, modelo de negocio
│   └── manuales - de empresa/    <-- Balance del MVP y piezas publicitarias
│
└── media/                        <-- Fotos subidas desde la web (se crea sola, no se sube a git)
```

</details>

<details>
<summary><b>Avisos por Gmail y Google Maps</b></summary>

La configuración va en un archivo **`.env`** en la raíz del proyecto (nunca se sube a GitHub).
Copiá el ejemplo y completalo:

```bash
cp .env.ejemplo .env
```

### Avisos por Gmail para todos los usuarios

| Quién | Recibe un email cuando… |
|---|---|
| **Todos** | crean su cuenta (bienvenida) |
| **Consumidor** | reserva (con el código de retiro y "Cómo llegar"), cancela, es el último día para retirar, el comercio confirma el retiro ("¿Cómo te fue?") y el comercio responde su opinión |
| **Comercio** | alguien reserva o cancela, un producto se queda sin stock, una organización pide una donación y un cliente deja una opinión |
| **Organización** | le aprueban o rechazan un pedido de donación y se publica una donación nueva |

Funcionan igual desde la web y desde la app. Cada persona puede apagarlos en *Mis datos → Avisos por email*
o con el link **"Dejar de recibir avisos"** que va al pie de cada email.

El recordatorio del último día se manda **solo** en la página publicada: una vez por día, con la primera
visita después de las 9 (`RECORDATORIOS_HORA`). No hace falta ninguna tarea programada.
En la compu se puede probar a mano:

```bash
python manage.py enviar_recordatorios
```

1. Usá una cuenta de Gmail para el proyecto (ej: `lup.avisos@gmail.com`) con la **verificación en 2 pasos** activada.
2. Entrá a https://myaccount.google.com/apppasswords y creá una **contraseña de aplicación** (16 letras).
3. En el `.env`:
   ```
   GMAIL_USUARIO=lup.avisos@gmail.com
   GMAIL_CLAVE_APP=abcdefghijklmnop
   ```
4. Reiniciá el servidor.

Sin esos datos los emails no se envían: se muestran en la consola donde corre `runserver` (sirve para probar).

### Ubicación del dispositivo y Google Maps

- **Al entrar** (inicio, ofertas y comercios) la página le pregunta al cliente si quiere usar su ubicación.
  Si acepta, se muestran solo los comercios y ofertas **cercanos** (radio de 2, 5, 10 o 25 km, o cualquier distancia).
  Si dice "Ahora no", no se le vuelve a preguntar por 7 días; siempre puede tocar **"Cerca mío"**.
- **Comercios** (`/comercios/`): lista de comercios ordenados por cercanía, con distancia, ofertas y opiniones.
- **Producto y página del comercio:** mapa de Google Maps, distancia ("A 1,2 km de vos") y botón **Cómo llegar**.
- **Mis datos (comercio):** botón *"Usar la ubicación de este dispositivo"* para marcar dónde está el local.

Funciona **sin clave**. Opcionalmente, con una clave de Google Cloud (activando *Maps Embed API* y *Geocoding API*)
se usan los mapas oficiales y cada comercio se ubica solo a partir de su dirección:

```
GOOGLE_MAPS_API_KEY=tu_clave
```

> Los navegadores solo comparten la ubicación en `localhost` o en sitios con **https**.

Con la clave, además, quien no quiera compartir su ubicación puede **escribir su dirección o barrio**.

</details>

<details>
<summary><b>Chat de ayuda con IA</b></summary>

En todas las páginas hay un botón **Ayuda** (abajo a la derecha) que abre un chat con **Lü**, el asistente de Lüp.
Conoce cómo funciona la página para cada tipo de cuenta y, si la persona inició sesión, sus reservas pendientes
(o las ofertas y retiros de su comercio) para dar respuestas concretas. Responde en español o inglés según la página.

- Funciona con **Claude** (API de Anthropic). Agregá al `.env`:

```
ANTHROPIC_API_KEY=tu_clave
SOPORTE_EMAIL=email_del_equipo@gmail.com
```

- Sin clave, el chat igual funciona con **respuestas automáticas** (preguntas frecuentes).
- **Hablar con una persona**: manda la conversación por email a `SOPORTE_EMAIL` (o a `GMAIL_USUARIO`) para responderle al usuario.
- Todas las charlas quedan en `/admin` → *Conversaciones de soporte* (se pueden marcar como resueltas).
- Límites: 800 caracteres por mensaje y 30 mensajes por hora por persona. El modelo se cambia con `SOPORTE_MODELO` (por defecto `claude-haiku-5-5`).

</details>

<details>
<summary><b>Publicar la página (Render)</b></summary>

La página está lista para publicarse en [Render](https://render.com) con el archivo `render.yaml`
(un *Blueprint*: Render lo lee y crea todo solo). Cada cambio que llega a `main` se publica automáticamente.

**Qué se crea** (planes pagos; el gratuito no manda emails, se duerme y borra la base a los 30 días):

| Parte | Plan en Render | Para qué |
|---|---|---|
| Página web `lup` | Starter (0.5 CPU, 512 MB) | Django con gunicorn; CSS y JS con WhiteNoise |
| Base de datos `lup-db` | PostgreSQL Basic 256 MB | Usuarios, comercios, ofertas, reservas |
| Disco `fotos` | 1 GB | Fotos de productos, logos y fotos de perfil |

Costo aproximado: unos US$13 por mes (verificar en render.com/pricing). Se puede dar de baja cuando quieran.

### Paso a paso

1. Creá una cuenta en Render con GitHub y dale acceso al repositorio `Code7C26/LUP`.
2. **New → Blueprint**, elegí el repositorio y la rama `main`. Render muestra lo que va a crear.
3. Completá las claves que pide (quedan solo en Render, nunca en GitHub):
   `GMAIL_USUARIO`, `GMAIL_CLAVE_APP`, y si las tienen, `ANTHROPIC_API_KEY` y `GOOGLE_MAPS_API_KEY`
   (las que no tengan, déjenlas vacías).
4. **Apply**. La primera vez tarda unos minutos: instala todo (`build.sh`), crea las tablas (`migrate`)
   y abre la página en `https://lup-xxxx.onrender.com`.
5. Creá la cuenta de administrador: en el servicio `lup` → **Shell** →
   `python manage.py createsuperuser`.
6. Cargá las cuentas y ofertas reales (la base publicada empieza vacía; lo de la compu no se copia).

### Dominio propio

1. Comprá el dominio (ej. `lupalimentos.com`).
2. En Render: servicio `lup` → **Settings → Custom Domains** → agregá `lupalimentos.com` y `www.lupalimentos.com`.
   La dirección principal es `www.lupalimentos.com`: la versión sin www redirige ahí.
   Render muestra los registros DNS que hay que cargar donde compraste el dominio. El https es automático.
3. En **Environment** agregá y guardá (la página se reinicia sola):
   ```
   DJANGO_ALLOWED_HOSTS=lupalimentos.com,www.lupalimentos.com
   SITIO_URL=https://www.lupalimentos.com
   ```
   `SITIO_URL` es la dirección que va en los links de los emails.
4. En la app (`app/.env` y en las variables de EAS): `EXPO_PUBLIC_URL_SERVIDOR=https://www.lupalimentos.com`.
   Tiene que ir **con www**: la redirección desde la dirección sin www pierde el inicio de sesión de la app.

### Cómo se actualiza

- **Código**: se trabaja en cada rama, se pasa a `main` y Render publica solo (unos minutos).
  Las migraciones corren solas antes de publicar. Si algo falla, la versión anterior sigue online.
- **Contenido** (ofertas, comercios, opiniones): desde la misma página o `/admin`, al instante.
- **Errores**: pestaña **Logs** del servicio. `/salud/` responde `ok` si la página y la base funcionan.

### Variables de la página publicada

| Variable | Valor | Quién la pone |
|---|---|---|
| `DJANGO_DEBUG` | `0` | `render.yaml` |
| `DJANGO_SECRET_KEY` | clave aleatoria | Render la genera |
| `DATABASE_URL` | dirección de PostgreSQL | Render, desde `lup-db` |
| `MEDIA_ROOT` | `/var/data/media` (el disco) | `render.yaml` |
| `DJANGO_ALLOWED_HOSTS`, `SITIO_URL` | el dominio propio | ustedes (sin dominio no hacen falta) |
| `GMAIL_*`, `ANTHROPIC_API_KEY`, `GOOGLE_MAPS_API_KEY`, `SOPORTE_EMAIL` | claves | ustedes, en Environment |

En la compu no cambia nada: sin estas variables se usa SQLite y el modo desarrollo de siempre.

</details>

<details>
<summary><b>Idiomas (español / inglés)</b></summary>

Toda la página se puede ver en inglés con el botón **EN / ES** de la barra (al lado del modo oscuro).
La elección se guarda en el navegador. La API de la app móvil responde siempre en español.

Las traducciones están en `scr/locale/en/LC_MESSAGES/django.po`. Para cambiar un texto en inglés:

1. Editá el `msgstr` en `django.po` (y los textos del JavaScript en `scr/static/js/lup-en.js`).
2. Corré `python manage.py compilar_traducciones` (no hace falta instalar nada).
3. Reiniciá el servidor.

Si agregás textos nuevos en las plantillas, envolvelos con `{% translate "..." %}` y sumalos al `.po`.
Lo que cargan los usuarios (nombres de productos, comercios, opiniones) no se traduce.

> Si tenías una base `db.sqlite3` de una versión anterior, borrala antes de `migrate`: los modelos se unificaron y las migraciones se regeneraron desde cero.
>
> Las fotos de productos ahora se guardan en `media/` (antes en `scr/jpg/`). Si tenés fotos viejas en tu compu, movelas de `scr/jpg/productos/` a `media/productos/`.

</details>


<p align="center"><br><b>Más valor. Menos desperdicio.</b></p>
