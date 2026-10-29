/* ==========================================================
   Lüp · Interacciones del sitio
   ========================================================== */
(function () {
    'use strict';

    // Textos del JavaScript en el idioma de la página (base.html carga el diccionario si está en inglés)
    const I18N = window.LUP_I18N || {};
    const T = (texto) => I18N[texto] || texto;
    const LOCALE = (document.documentElement.lang || 'es').startsWith('en') ? 'en-US' : 'es-AR';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    /* ---------- Modo oscuro / claro ---------- */
    // El tema inicial lo aplica un script en el <head> de base.html.
    const raiz = document.documentElement;
    const botonesTema = $$('[data-cambiar-tema]');
    const etiquetarBotones = () => {
        const oscuro = raiz.getAttribute('data-bs-theme') === 'dark';
        botonesTema.forEach((b) => {
            b.setAttribute('aria-label', oscuro ? T('Cambiar a modo claro') : T('Cambiar a modo oscuro'));
            b.setAttribute('aria-pressed', oscuro ? 'true' : 'false');
        });
    };
    botonesTema.forEach((b) => b.addEventListener('click', () => {
        const nuevo = raiz.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        raiz.setAttribute('data-bs-theme', nuevo);
        try { localStorage.setItem('lup-tema', nuevo); } catch (e) { /* modo privado: no se recuerda */ }
        etiquetarBotones();
    }));
    // Si la persona no eligió nada, seguir los cambios del sistema operativo
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            let guardado = null;
            try { guardado = localStorage.getItem('lup-tema'); } catch (err) { /* sin storage */ }
            if (!guardado) { raiz.setAttribute('data-bs-theme', e.matches ? 'dark' : 'light'); etiquetarBotones(); }
        });
    }
    etiquetarBotones();

    /* ---------- Navbar con sombra al hacer scroll ---------- */
    const navbar = $('.navbar-lup');
    if (navbar) {
        const actualizar = () => navbar.classList.toggle('scrolled', window.scrollY > 8);
        window.addEventListener('scroll', actualizar, { passive: true });
        actualizar();
    }

    /* ---------- Mensajes como toasts ---------- */
    if (window.bootstrap) {
        $$('.toast').forEach((el) => new bootstrap.Toast(el, { delay: 6000 }).show());
    }

    /* ---------- Animación de aparición ---------- */
    const revelables = $$('.revelar');
    if ('IntersectionObserver' in window && revelables.length) {
        const obs = new IntersectionObserver((entradas) => {
            entradas.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.12 });
        revelables.forEach((el) => obs.observe(el));
    } else {
        revelables.forEach((el) => el.classList.add('visible'));
    }

    /* ---------- Contadores animados ---------- */
    const contadores = $$('[data-contador]');
    if (contadores.length && 'IntersectionObserver' in window) {
        const animar = (el) => {
            const final = parseInt(el.dataset.contador, 10) || 0;
            const dur = 1200;
            const inicio = performance.now();
            const paso = (t) => {
                const p = Math.min((t - inicio) / dur, 1);
                el.textContent = Math.round(final * (1 - Math.pow(1 - p, 3))).toLocaleString('es-AR');
                if (p < 1) requestAnimationFrame(paso);
            };
            requestAnimationFrame(paso);
        };
        const obs = new IntersectionObserver((entradas) => {
            entradas.forEach((e) => {
                if (e.isIntersecting) { animar(e.target); obs.unobserve(e.target); }
            });
        });
        contadores.forEach((el) => obs.observe(el));
    }

    /* ---------- Mostrar / ocultar contraseña ---------- */
    $$('input[type="password"]').forEach((input) => {
        if (input.closest('.campo-password')) return;
        const wrap = document.createElement('div');
        wrap.className = 'campo-password';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'toggle-password';
        btn.setAttribute('aria-label', T('Mostrar contraseña'));
        btn.innerHTML = '<i class="bi bi-eye"></i>';
        btn.addEventListener('click', () => {
            const visible = input.type === 'text';
            input.type = visible ? 'password' : 'text';
            btn.innerHTML = visible ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
            btn.setAttribute('aria-label', visible ? T('Mostrar contraseña') : T('Ocultar contraseña'));
        });
        wrap.appendChild(btn);
    });

    /* ---------- Medidor de fuerza de contraseña ---------- */
    const pass1 = $('#id_password1');
    if (pass1) {
        const barra = document.createElement('div');
        barra.className = 'fuerza';
        barra.innerHTML = '<span></span>';
        const texto = document.createElement('div');
        texto.className = 'form-text';
        pass1.closest('.campo-password').after(barra, texto);
        const span = barra.firstChild;
        const niveles = [
            ['0%', '#d64545', ''],
            ['25%', '#d64545', T('Muy débil')],
            ['50%', '#E39B2D', T('Débil')],
            ['75%', '#9bbf3b', T('Buena')],
            ['100%', '#4f8a35', T('¡Excelente!')],
        ];
        pass1.addEventListener('input', () => {
            const v = pass1.value;
            let puntos = 0;
            if (v.length >= 8) puntos++;
            if (/[A-Z]/.test(v) && /[a-z]/.test(v)) puntos++;
            if (/\d/.test(v)) puntos++;
            if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) puntos++;
            if (!v) puntos = 0;
            const [ancho, color, etiqueta] = niveles[puntos];
            span.style.width = ancho;
            span.style.background = color;
            texto.textContent = etiqueta;
        });
    }

    /* ---------- Selector de rol en el login ---------- */
    const selector = $('.selector-rol');
    if (selector) {
        const inputRol = $('#id_rol');
        const botonEnviar = $('#btn-ingresar');
        const linkRegistro = $('#link-registro');
        selector.addEventListener('click', (ev) => {
            const btn = ev.target.closest('button[data-rol]');
            if (!btn) return;
            $$('button', selector).forEach((b) => {
                b.classList.toggle('activo', b === btn);
                b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
            });
            const rol = btn.dataset.rol;
            if (inputRol) inputRol.value = rol;
            $$('[data-rol-info]').forEach((el) => { el.hidden = el.dataset.rolInfo !== rol; });
            if (botonEnviar) botonEnviar.textContent = 'Ingresar como ' + btn.dataset.titulo.toLowerCase();
            if (linkRegistro) linkRegistro.href = linkRegistro.dataset.base.replace('__rol__', rol);
        });
    }

    /* ---------- Validación en el cliente (Bootstrap) ---------- */
    $$('form.needs-validation').forEach((form) => {
        form.addEventListener('submit', (ev) => {
            if (!form.checkValidity()) {
                ev.preventDefault();
                ev.stopPropagation();
                const primero = form.querySelector(':invalid');
                if (primero) primero.focus();
            } else {
                const btn = form.querySelector('[type="submit"]');
                if (btn) {
                    btn.disabled = true;
                    btn.dataset.textoOriginal = btn.innerHTML;
                    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>' + T('Procesando...');
                }
            }
            form.classList.add('was-validated');
        });
    });

    /* ---------- Formateo automático de CUIT ---------- */
    const cuit = $('#id_cuit');
    if (cuit) {
        cuit.addEventListener('input', () => {
            const d = cuit.value.replace(/\D/g, '').slice(0, 11);
            let out = d;
            if (d.length > 2) out = d.slice(0, 2) + '-' + d.slice(2);
            if (d.length > 10) out = d.slice(0, 2) + '-' + d.slice(2, 10) + '-' + d.slice(10);
            cuit.value = out;
        });
    }

    /* ---------- Catálogo: filtros en vivo ---------- */
    const formFiltros = $('#form-filtros');
    const grilla = $('#grilla-productos');
    if (formFiltros && grilla) {
        let temporizador;
        let controlador;
        const contador = $('#contador-resultados');

        const actualizar = () => {
            const params = new URLSearchParams(new FormData(formFiltros));
            for (const [k, v] of Array.from(params.entries())) { if (!v) params.delete(k); }
            const url = formFiltros.action + (params.toString() ? '?' + params : '');
            history.replaceState(null, '', url);
            if (controlador) controlador.abort();
            controlador = new AbortController();
            grilla.classList.add('cargando');
            fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, signal: controlador.signal })
                .then((r) => r.text())
                .then((html) => {
                    grilla.innerHTML = html;
                    const total = grilla.querySelector('[data-total]');
                    if (contador && total) contador.textContent = total.dataset.total;
                })
                .catch((err) => { if (err.name !== 'AbortError') formFiltros.submit(); })
                .finally(() => grilla.classList.remove('cargando'));
        };

        formFiltros.addEventListener('input', (ev) => {
            clearTimeout(temporizador);
            temporizador = setTimeout(actualizar, ev.target.type === 'search' ? 300 : 0);
        });
        formFiltros.addEventListener('submit', (ev) => { ev.preventDefault(); actualizar(); });

        // Chips de categoría
        $$('.chip[data-categoria]').forEach((chip) => {
            chip.addEventListener('click', () => {
                $$('.chip[data-categoria]').forEach((c) => c.classList.toggle('activo', c === chip));
                $('#id_categoria_filtro').value = chip.dataset.categoria;
                actualizar();
            });
        });
    }

    /* ---------- Selector de cantidad + total ---------- */
    $$('.cantidad').forEach((caja) => {
        const input = $('input', caja);
        const total = $('#total-reserva');
        const precio = parseFloat((total && total.dataset.precio) || '0');
        const max = parseInt(input.max || '99', 10);
        const refrescar = () => {
            let v = parseInt(input.value, 10) || 1;
            v = Math.max(1, Math.min(max, v));
            input.value = v;
            if (total) total.textContent = '$' + (precio * v).toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };
        caja.addEventListener('click', (ev) => {
            const b = ev.target.closest('button[data-delta]');
            if (!b) return;
            input.value = (parseInt(input.value, 10) || 1) + parseInt(b.dataset.delta, 10);
            refrescar();
        });
        input.addEventListener('input', refrescar);
        refrescar();
    });

    /* ---------- Publicar excedente: vista previa en vivo ---------- */
    const formProducto = $('#form-producto');
    if (formProducto) {
        const campo = (n) => $('#id_' + n);
        const pv = (n) => $('[data-preview="' + n + '"]');
        const formato = (n) => '$' + (n || 0).toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

        const refrescar = () => {
            const titulo = campo('titulo').value.trim();
            pv('titulo').textContent = titulo || T('Título de tu oferta');
            const desc = campo('descripcion').value.trim();
            pv('descripcion').textContent = desc ? desc.slice(0, 90) + (desc.length > 90 ? '…' : '') : T('Así verán los consumidores tu publicación.');
            const orig = parseFloat(campo('precio_original').value);
            const desc2 = parseFloat(campo('precio_descuento').value);
            pv('precio').textContent = formato(desc2);
            pv('antes').textContent = orig ? formato(orig) : '';
            const badge = pv('descuento');
            const aviso = $('#aviso-precio');
            if (orig > 0 && desc2 >= 0 && desc2 < orig) {
                badge.hidden = false;
                badge.textContent = '-' + Math.round((1 - desc2 / orig) * 100) + '%';
            } else {
                badge.hidden = true;
            }
            if (aviso) aviso.hidden = !(orig > 0 && desc2 > orig);
            pv('donacion').hidden = !campo('es_donacion').checked;
            pv('stock').textContent = (campo('stock').value || 1) + ' ' + T('disp.');
            const cat = campo('categoria');
            pv('categoria').textContent = cat.options[cat.selectedIndex].text;
        };
        formProducto.addEventListener('input', refrescar);
        formProducto.addEventListener('change', refrescar);
        refrescar();

        const img = campo('imagen');
        if (img) {
            img.addEventListener('change', () => {
                const archivo = img.files && img.files[0];
                if (!archivo) return;
                const lector = new FileReader();
                lector.onload = (e) => {
                    const foto = pv('foto');
                    foto.innerHTML = '';
                    const el = document.createElement('img');
                    el.src = e.target.result;
                    el.alt = T('Vista previa');
                    foto.appendChild(el);
                };
                lector.readAsDataURL(archivo);
            });
        }

        // Atajos de descuento
        $$('[data-descuento]').forEach((b) => {
            b.addEventListener('click', () => {
                const orig = parseFloat(campo('precio_original').value);
                if (!orig) { campo('precio_original').focus(); return; }
                campo('precio_descuento').value = (orig * (1 - b.dataset.descuento / 100)).toFixed(2);
                refrescar();
            });
        });
    }

    /* ---------- Foto de perfil: vista previa antes de guardar ---------- */
    const inputFoto = $('#id_u-foto');
    const previewAvatar = $('#preview-avatar');
    if (inputFoto && previewAvatar) {
        const quitar = $('#id_u-quitar_foto');
        const ayuda = $('#ayuda-foto');
        const textoAyuda = ayuda ? ayuda.textContent : '';
        inputFoto.addEventListener('change', () => {
            const archivo = inputFoto.files && inputFoto.files[0];
            if (!archivo) return;
            if (archivo.size > 5 * 1024 * 1024) {
                inputFoto.value = '';
                if (ayuda) { ayuda.textContent = T('Esa imagen pesa más de 5 MB. Probá con una más liviana.'); ayuda.classList.add('text-danger'); }
                return;
            }
            if (ayuda) { ayuda.textContent = textoAyuda; ayuda.classList.remove('text-danger'); }
            const lector = new FileReader();
            lector.onload = (e) => {
                previewAvatar.innerHTML = '';
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = T('Vista previa de tu foto');
                previewAvatar.appendChild(img);
                previewAvatar.classList.add('con-foto');
                previewAvatar.style.opacity = '';
            };
            lector.readAsDataURL(archivo);
            if (quitar) quitar.checked = false;
        });
        if (quitar) {
            quitar.addEventListener('change', () => {
                previewAvatar.style.opacity = quitar.checked ? '.35' : '';
                if (quitar.checked) inputFoto.value = '';
            });
        }
    }

    /* ==========================================================
       Ubicación del dispositivo (Geolocation API del navegador)
       ========================================================== */
    const CLAVE_UBICACION = 'lup-ubicacion';
    const UBICACION_VALIDA_MS = 6 * 60 * 60 * 1000; // se reutiliza durante 6 horas

    const ubicacionGuardada = () => {
        try {
            const u = JSON.parse(localStorage.getItem(CLAVE_UBICACION) || 'null');
            if (u && Date.now() - u.t < UBICACION_VALIDA_MS) return u;
        } catch (e) { /* sin storage */ }
        return null;
    };

    const mensajeErrorUbicacion = (err) => {
        if (!window.isSecureContext) return T('El navegador solo comparte la ubicación en sitios seguros (https o localhost).');
        if (!err) return T('Tu navegador no permite obtener la ubicación.');
        if (err.code === 1) return T('No diste permiso para usar tu ubicación. Podés activarlo desde el candado de la barra de direcciones.');
        if (err.code === 3) return T('Tardó demasiado en encontrar tu ubicación. Probá de nuevo.');
        return T('No pudimos obtener tu ubicación. Probá de nuevo en unos segundos.');
    };

    // Pide la ubicación al dispositivo. Devuelve una promesa con {lat, lng, precision}.
    const pedirUbicacion = (opciones = {}) => new Promise((resolver, rechazar) => {
        if (!opciones.forzar) {
            const guardada = ubicacionGuardada();
            if (guardada) { resolver(guardada); return; }
        }
        if (!('geolocation' in navigator) || !window.isSecureContext) { rechazar(null); return; }
        navigator.geolocation.getCurrentPosition((pos) => {
            const u = {
                lat: +pos.coords.latitude.toFixed(6),
                lng: +pos.coords.longitude.toFixed(6),
                precision: Math.round(pos.coords.accuracy),
                t: Date.now(),
            };
            try { localStorage.setItem(CLAVE_UBICACION, JSON.stringify(u)); } catch (e) { /* sin storage */ }
            resolver(u);
        }, rechazar, { enableHighAccuracy: !!opciones.precisa, timeout: 12000, maximumAge: 60000 });
    });

    const radianes = (g) => g * Math.PI / 180;
    const distanciaKm = (a, b) => {
        const dLat = radianes(b.lat - a.lat);
        const dLng = radianes(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(radianes(a.lat)) * Math.cos(radianes(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * 6371 * Math.asin(Math.sqrt(h));
    };
    const formatoDistancia = (km) => (km < 1
        ? Math.max(Math.round(km * 100) * 10, 10) + ' m'
        : (km < 10 ? km.toLocaleString(LOCALE, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : Math.round(km)) + ' km');

    /* ==========================================================
       Ubicación del cliente: se pide al entrar y se usa para buscar
       comercios y ofertas cercanas (inicio, ofertas y comercios).
       ========================================================== */
    const CLAVE_RECHAZO = 'lup-ubicacion-rechazo';
    const RECHAZO_MS = 7 * 24 * 60 * 60 * 1000; // si dice "Ahora no", no se vuelve a preguntar por 7 días
    const rol = document.body.dataset.rol || 'visitante';
    const esCliente = rol === 'visitante' || rol === 'consumidor';
    const homeCerca = $('[data-home-cerca]');
    const formComercios = $('[data-form-ubicacion]');
    const paginaUsaUbicacion = !!(homeCerca || formFiltros || formComercios);
    const banner = $('[data-pedir-ubicacion]');

    const leerStorage = (clave) => { try { return localStorage.getItem(clave); } catch (e) { return null; } };
    const guardarStorage = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch (e) { /* sin storage */ } };

    const mostrarBanner = () => { if (banner) banner.hidden = false; };
    const ocultarBanner = () => { if (banner) banner.hidden = true; };
    const errorBanner = (texto) => {
        const el = banner && $('[data-error-ubicacion]', banner);
        if (el) { el.textContent = texto || ''; el.hidden = !texto; }
    };

    // Avisa a la página que ya se conoce la ubicación (cada sección decide qué hacer)
    const usarUbicacion = (u) => {
        ocultarBanner();
        document.dispatchEvent(new CustomEvent('lup:ubicacion', { detail: u }));
    };

    const estadoPermiso = () => (navigator.permissions && navigator.permissions.query
        ? navigator.permissions.query({ name: 'geolocation' }).then((r) => r.state).catch(() => 'prompt')
        : Promise.resolve('prompt'));

    if (banner) {
        $$('[data-permitir-ubicacion]', banner).forEach((b) => b.addEventListener('click', () => {
            const original = b.innerHTML;
            b.disabled = true;
            b.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>' + T('Buscando…');
            errorBanner('');
            pedirUbicacion({ forzar: true })
                .then(usarUbicacion)
                .catch((err) => errorBanner(mensajeErrorUbicacion(err)))
                .finally(() => { b.disabled = false; b.innerHTML = original; });
        }));
        $$('[data-rechazar-ubicacion]', banner).forEach((b) => b.addEventListener('click', () => {
            guardarStorage(CLAVE_RECHAZO, String(Date.now()));
            ocultarBanner();
        }));
        const formDireccion = $('[data-direccion-manual]', banner);
        if (formDireccion) {
            formDireccion.addEventListener('submit', (ev) => {
                ev.preventDefault();
                const q = formDireccion.q.value.trim();
                if (q.length < 3) return;
                errorBanner('');
                fetch(formDireccion.action + '?q=' + encodeURIComponent(q))
                    .then((r) => r.json().then((datos) => ({ ok: r.ok, datos })))
                    .then(({ ok, datos }) => {
                        if (!ok) { errorBanner(datos.error || T('No encontramos esa dirección.')); return; }
                        const u = { lat: datos.lat, lng: datos.lng, t: Date.now(), manual: true };
                        guardarStorage(CLAVE_UBICACION, JSON.stringify(u));
                        usarUbicacion(u);
                    })
                    .catch(() => errorBanner(T('No pudimos buscar la dirección. Probá de nuevo.')));
            });
        }
    }

    // Botones "Cerca mío" (ofertas y comercios): piden la ubicación en el momento
    $$('[data-cerca-mio]').forEach((boton) => {
        const texto = $('span', boton);
        const aviso = boton.closest('form') && $('[data-aviso-ubicacion]', boton.closest('form'));
        boton.addEventListener('click', () => {
            texto.textContent = T('Buscando…');
            boton.disabled = true;
            if (aviso) aviso.hidden = true;
            pedirUbicacion({ forzar: true })
                .then(usarUbicacion)
                .catch((err) => {
                    texto.textContent = T('Cerca mío');
                    if (aviso) { aviso.textContent = mensajeErrorUbicacion(err); aviso.hidden = false; }
                })
                .finally(() => { boton.disabled = false; });
        });
    });

    const marcarCerca = (form) => {
        const boton = $('[data-cerca-mio]', form);
        if (boton) {
            boton.classList.add('activo');
            boton.setAttribute('aria-pressed', 'true');
            $('span', boton).textContent = T('Cerca tuyo');
        }
        const radio = $('select[name="radio"]', form);
        if (radio) radio.hidden = false;
    };

    /* ---------- Ofertas: filtrar por distancia ---------- */
    if (formFiltros) {
        const inputLat = $('#id_lat');
        const inputLng = $('#id_lng');
        const selectOrden = $('#id_orden');
        const recargar = () => formFiltros.dispatchEvent(new Event('submit', { cancelable: true }));
        document.addEventListener('lup:ubicacion', (ev) => {
            const u = ev.detail;
            if (inputLat.value && Math.abs(inputLat.value - u.lat) < 1e-4 && Math.abs(inputLng.value - u.lng) < 1e-4) return;
            inputLat.value = u.lat;
            inputLng.value = u.lng;
            selectOrden.value = 'cercania';
            marcarCerca(formFiltros);
            recargar();
        });
        // Elegir "Más cerca" sin ubicación: pedirla
        selectOrden.addEventListener('change', () => {
            if (selectOrden.value === 'cercania' && !inputLat.value) {
                pedirUbicacion({ forzar: false }).then(usarUbicacion).catch((err) => {
                    selectOrden.value = 'recientes';
                    const aviso = $('[data-aviso-ubicacion]', formFiltros);
                    if (aviso) { aviso.textContent = mensajeErrorUbicacion(err); aviso.hidden = false; }
                });
            }
        });
        // "Ver todas" cuando hay ofertas más lejos que el radio (el botón viene en la grilla)
        document.addEventListener('click', (ev) => {
            if (!ev.target.closest('[data-ampliar-radio]')) return;
            $('#id_radio').value = 'todos';
            recargar();
        });
    }

    /* ---------- Comercios: misma idea, recargando la página ---------- */
    if (formComercios) {
        const inputLat = $('input[name="lat"]', formComercios);
        const inputLng = $('input[name="lng"]', formComercios);
        document.addEventListener('lup:ubicacion', (ev) => {
            if (inputLat.value) return; // la página ya viene filtrada por la ubicación
            inputLat.value = ev.detail.lat;
            inputLng.value = ev.detail.lng;
            marcarCerca(formComercios);
            formComercios.submit();
        });
        document.addEventListener('click', (ev) => {
            if (!ev.target.closest('[data-ampliar-radio]')) return;
            $('select[name="radio"]', formComercios).value = 'todos';
            formComercios.submit();
        });
    }

    /* ---------- Inicio: ofertas y comercios cercanos ---------- */
    if (homeCerca) {
        document.addEventListener('lup:ubicacion', (ev) => {
            const u = ev.detail;
            fetch(homeCerca.dataset.homeCerca + '?lat=' + u.lat + '&lng=' + u.lng)
                .then((r) => (r.ok ? r.json() : Promise.reject(r)))
                .then((datos) => {
                    homeCerca.innerHTML = datos.ofertas_html;
                    const comercios = $('#home-comercios');
                    if (comercios) { comercios.innerHTML = datos.comercios_html; comercios.hidden = false; }
                })
                .catch(() => { /* si falla, queda la home general */ });
        });
    }

    // Al entrar (después de registrar a quién le interesa): usar la ubicación si ya la conocemos; si no, pedirla (con nuestro aviso primero)
    if (paginaUsaUbicacion) {
        const guardada = ubicacionGuardada();
        if (guardada) {
            usarUbicacion(guardada);
        } else {
            estadoPermiso().then((estado) => {
                if (estado === 'granted') {
                    pedirUbicacion({ forzar: true }).then(usarUbicacion).catch(() => {});
                } else if (estado === 'prompt' && esCliente) {
                    const rechazo = parseInt(leerStorage(CLAVE_RECHAZO) || '0', 10);
                    if (Date.now() - rechazo > RECHAZO_MS) setTimeout(mostrarBanner, 900);
                }
            });
        }
    }


    /* ---------- Detalle / comercio: "A 1,2 km de vos" ---------- */
    const etiquetasDistancia = $$('[data-distancia-a]');
    if (etiquetasDistancia.length) {
        const guardada = ubicacionGuardada();
        if (guardada) {
            etiquetasDistancia.forEach((el) => {
                const [lat, lng] = el.dataset.distanciaA.split(',').map(Number);
                el.innerHTML = '<i class="bi bi-geo-alt-fill text-lup"></i> ' + T('A %s de vos').replace('%s', formatoDistancia(distanciaKm(guardada, { lat, lng })));
            });
        }
    }

    /* ---------- Mis datos (comercio): ubicación del local ---------- */
    const bloqueLocal = $('[data-ubicacion-local]');
    if (bloqueLocal) {
        const boton = $('[data-usar-ubicacion]', bloqueLocal);
        const estado = $('[data-estado-ubicacion]', bloqueLocal);
        const mapa = $('[data-mapa]', bloqueLocal);
        const inputLat = $('#id_p-latitud');
        const inputLng = $('#id_p-longitud');
        const clave = bloqueLocal.dataset.mapsKey;

        boton.addEventListener('click', () => {
            const original = boton.innerHTML;
            boton.disabled = true;
            boton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>' + T('Buscando…');
            pedirUbicacion({ forzar: true, precisa: true })
                .then((u) => {
                    inputLat.value = u.lat;
                    inputLng.value = u.lng;
                    estado.innerHTML = '<i class="bi bi-geo-alt-fill text-lup"></i> ' + T('Ubicación marcada')
                        + (u.precision ? ' (±' + u.precision + ' m)' : '')
                        + '. ' + T('<strong>Guardá los cambios</strong> para confirmarla.');
                    const q = encodeURIComponent(u.lat + ',' + u.lng);
                    const src = clave
                        ? 'https://www.google.com/maps/embed/v1/place?key=' + encodeURIComponent(clave) + '&q=' + q + '&zoom=17&language=' + (LOCALE === 'en-US' ? 'en' : 'es')
                        : 'https://maps.google.com/maps?q=' + q + '&z=17&hl=es&output=embed';
                    mapa.innerHTML = '<iframe src="' + src + '" title="' + T('Ubicación marcada en Google Maps') + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>';
                    mapa.hidden = false;
                })
                .catch((err) => {
                    estado.innerHTML = '<span class="text-danger">' + mensajeErrorUbicacion(err) + '</span>';
                })
                .finally(() => { boton.disabled = false; boton.innerHTML = original; });
        });
    }

    /* ---------- Confirmaciones ---------- */
    document.addEventListener('submit', (ev) => {
        const msg = ev.target.dataset && ev.target.dataset.confirmar;
        if (msg && !window.confirm(msg)) ev.preventDefault();
    });

    /* ---------- Copiar código de retiro ---------- */
    $$('[data-copiar]').forEach((b) => {
        b.addEventListener('click', () => {
            if (!navigator.clipboard) return;
            navigator.clipboard.writeText(b.dataset.copiar).then(() => {
                const original = b.innerHTML;
                b.innerHTML = '<i class="bi bi-check2"></i>';
                setTimeout(() => { b.innerHTML = original; }, 1500);
            });
        });
    });
})();
