# Rendimiento y compilación final — ArtesaNica

Revisión del requisito **«Compilación Final»**: app rápida, comprimida y lista para
producción. Medido sobre el repositorio el **2026-10-08** con
`npx astro build --config astro.config.docker.mjs` (el build de servidor propio,
que es el que alimenta Docker y Azure).

Reproducir:

```bash
cd ~/Artesa_Nica
npx astro build --config astro.config.docker.mjs     # build de producción
du -sh dist && find dist -type f | wc -l             # tamaño y nº de archivos
```

---

## 1. Estado del build: ✅ correcto y reproducible

| Comprobación | Resultado |
| :--- | :--- |
| `astro build` (config contenedor) | **exit 0**, «Complete!» |
| Salida | `dist/` con `client/` + `server/`, **5,9 MB**, 187 archivos |
| Servidor standalone | `dist/server/entry.mjs` (327 KB) arranca y sirve páginas, `/api/*` y `/healthz` |
| Minificado | Sí (Vite/Astro en modo producción) |
| Nombres con hash + caché | Sí (`/_astro/*.<hash>.js`, con `Cache-Control: immutable` en nginx) |
| Source maps | **0** archivos `.map` (no se filtran las fuentes) |
| `astro check` | 0 errores |
| Compresión de las respuestas | nginx: `gzip on` en el vhost ✔ · Azure: **falta** (ver §3) |

## 2. Peso real (medido)

| Grupo | Archivos | Crudo | Gzip -9 |
| :--- | :---: | ---: | ---: |
| JS del cliente | 52 | 881 KB | **265 KB** |
| CSS | 3 | 167 KB | **30 KB** |
| PNG (`public/`) | 7 | **274 KB** | no comprime (ya optimizados, ver §3.1) |
| Fuentes (woff2, self-host) | 5 | 38 KB | — |
| Servidor (`entry.mjs`) | 1 | 327 KB | — |

Los 5 archivos más pesados del cliente:

| Archivo | Crudo | Gzip |
| :--- | ---: | ---: |
| `_astro/client.<hash>.js` | 204 KB | 63,6 KB |
| `_astro/leaflet.<hash>.js` | 150 KB | 43,4 KB |
| `_astro/_astro_transitions.<hash>.css` | 142 KB | 21,5 KB |
| `_astro/MapExperience.<hash>.js` | 121 KB | 30,8 KB |
| `_astro/ProfileApp.<hash>.js` | 88 KB | 19,2 KB |

El JS se reparte en *chunks* por vista (el mapa y el perfil solo se descargan
cuando se visita esa pantalla), así que el JS gzip de una página típica es una
fracción de esos 265 KB.

## 3. Lo que falta para «ultra rápida»

### ✅ 1. Logotipos optimizados: 2 727 KB → 274 KB (−90 %)

`public/` tenía 4 PNG de **2160×2160 px** que la interfaz muestra a **32–40 px**
(`h-7` … `h-10`; en `AuthPanel` también 32 px dentro de su recuadro de 48 px).

**Hecho, sin tocar el diseño**: los mismos 4 archivos, con los mismos nombres, la
misma transparencia (RGBA) y los mismos colores, reescalados con LANCZOS a
**512×512** (12,8× el tamaño máximo renderizado: cubre cualquier DPR) y guardados
con `optimize=True, compress_level=9`.

| Archivo | Antes | Ahora |
| :--- | ---: | ---: |
| `Logo.png` (claro) | 1249 KB | **125 KB** |
| `Logo Blanco.png` (oscuro) | 345 KB | **42 KB** |
| `Logo Negro.png` (sin usar) | 348 KB | **40 KB** |
| `Logo escala de Grises.png` (sin usar) | 785 KB | **64 KB** |
| **Total** | **2727 KB** | **274 KB** |

Resultado en el artefacto: `dist/` pasa de **5506 KB a 3052 KB** (−45 %) y el grupo
PNG de 2732 KB a 274 KB.

**No se tocó ni una línea de componentes, estilos ni HTML** (los nombres de archivo
no cambian), así que el diseño es idéntico. Verificación de regresión visual:

| Comparación | Resultado |
| :--- | :--- |
| Los 4 logos renderizados a su tamaño real (`h-10`/`h-9`/`h-8`/`h-7`) en fondo claro y oscuro, DPR 3 | **0,000 % de píxeles distintos** (idénticos) |
| Página `/login` completa, DPR 2 | 0,009 % de píxeles con diferencia ≤ 2/255 · RMS 0,10/255 → imperceptible |

Los originales de 2160 px siguen en el historial de Git (están versionados):
`git show HEAD:"public/Logo.png" > Logo-2160.png`.

Reproducir el reescalado:

```python
from PIL import Image
im = Image.open('public/Logo.png').resize((512, 512), Image.LANCZOS)
im.save('public/Logo.png', 'PNG', optimize=True, compress_level=9)
```

Queda pendiente lo obvio y de bajo riesgo: `Logo Negro.png` y
`Logo escala de Grises.png` (104 KB) **no se referencian en ninguna parte**; se
pueden borrar cuando quieras (no lo hice porque pediste solo optimizar).

### 🟠 2. Sin compresión en el borde para Azure

En el despliegue con nginx la compresión está resuelta (`gzip on`, `gzip_types`
cubre JS/CSS/JSON/SVG). En **Azure App Service la app es el borde y no comprime**:
el servidor `@astrojs/node` sirve los archivos tal cual. Opciones: poner Azure
Front Door/CDN delante (recomendado, además cachea), o precomprimir los estáticos
(`.br`/`.gz`) y servirlos. Con CDN, el JS de una página típica baja de ~265 KB a
~70 KB en el cable.

### 🟡 3. CSS de transiciones de 142 KB

`_astro_transitions.<hash>.css` (142 KB, 21 KB gzip). No es grave (gzip lo deja
pequeño), pero es el mayor CSS del sitio y parece global: vale la pena revisar si
todo ese bloque se usa en todas las vistas.

### ⚪ 4. Aviso de build (ruido, no error)

```
[WARN] [astro-icon] Failed to load icons from "src/icons": ENOENT …
```

No existe el directorio `src/icons/`; los iconos vienen de `@iconify-json/lucide`.
Se puede silenciar ajustando la config de `astro-icon` (o creando el directorio),
pero no afecta al resultado.

## 4. Resumen para la entrega

| Criterio | Estado |
| :--- | :--- |
| Compila en producción sin errores | ✅ |
| Minificado, con hash y cacheable | ✅ |
| Autocontenida (un `entry.mjs` + estáticos) | ✅ |
| Sin secretos dentro del artefacto | ✅ (todo por variables de entorno) |
| Sonda de salud para la plataforma | ✅ `/healthz` |
| Comprimida | ⚠️ nginx sí · Azure falta (CDN o `.br`) |
| Ultra rápida | ✅ logotipos 2,7 MB → 274 KB y JS en chunks por vista (265 KB gzip en total) |

**Siguiente acción con mejor relación impacto/esfuerzo**: la compresión en el
borde para Azure (§3.2). Del lado del repositorio, el peso ya está bajo control:
el mayor peso que queda es `client.<hash>.js` (204 KB → 63,6 KB gzip) más el chunk
del mapa, que solo se descarga en `/mapa`.
