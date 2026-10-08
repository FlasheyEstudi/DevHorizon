# Changelog

## [0.1.21](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.20...artesa-nica-v0.1.21) (2026-10-07)


### Features

* **news:** rediseñar sección de noticias con estilo editorial, filtros y boletín ([bf3adf0](https://github.com/moises717/Artesa_Nica/commit/bf3adf085509254b1080a66dbc1f563c7ed72c2a))

## [0.1.20](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.19...artesa-nica-v0.1.20) (2026-09-27)


### Features

* **maps:** cargar las categorias desde la base de datos con conteo en vivo ([1333e6d](https://github.com/moises717/Artesa_Nica/commit/1333e6d98c00ba481aec440b9be769164be78367))


### Bug Fixes

* **stores:** asignar la especialidad artesanal real a los talleres de muestra ([d20d620](https://github.com/moises717/Artesa_Nica/commit/d20d6200e97084c507172c286b7c2808802a52ef))

## [0.1.19](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.18...artesa-nica-v0.1.19) (2026-09-27)


### Features

* **maps:** mostrar el estado de apertura en tiempo real en directorio, hoja y tarjeta ([a62b2fd](https://github.com/moises717/Artesa_Nica/commit/a62b2fdd1f45e82ec93cd7ee93a5e19fc4d36888))
* **maps:** propagar horarios y descripcion de los talleres al DTO del mapa ([76d9c0d](https://github.com/moises717/Artesa_Nica/commit/76d9c0d45a8b87e33b26fac589f4d6726d08b03a))
* **maps:** redisenar markers y clusters con iconos por categoria ([fb0509a](https://github.com/moises717/Artesa_Nica/commit/fb0509aca738696172c6feef8254505fba5c6f43))
* **stores:** agregar horarios de taller y calculadora de estado de apertura ([72f7526](https://github.com/moises717/Artesa_Nica/commit/72f75262ca1d65dfbe104ff1d2746dfee09a9a29))

## [0.1.18](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.17...artesa-nica-v0.1.18) (2026-09-27)


### Features

* **maps:** implementar directorio maestro de talleres con layout dual-pane en desktop ([b3c057b](https://github.com/moises717/Artesa_Nica/commit/b3c057bbf6b8bf278e4effed0a0b3c4c34c049af))
* **maps:** redisenar la experiencia mobile del mapa con controles flotantes y bottom sheet gestual ([027b6e8](https://github.com/moises717/Artesa_Nica/commit/027b6e835e7b6e68875779cbd82d72457b2b064e))


### Bug Fixes

* **maps:** permitir tiles de Esri en la CSP para la vista satelital ([12e3a3c](https://github.com/moises717/Artesa_Nica/commit/12e3a3cb20bd0e84cdaecfd2810211ddcb0f6a7d))

## [0.1.17](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.16...artesa-nica-v0.1.17) (2026-09-27)


### Features

* **api:** agregar endpoint /api/categories con listado cacheado de categorias ([9c9fa10](https://github.com/moises717/Artesa_Nica/commit/9c9fa101dbd9cae193207fde02a53ef77dcb7a87))
* **catalog:** agregar barra de filtros rapidos por categoria y badge en las cards ([3c07d5e](https://github.com/moises717/Artesa_Nica/commit/3c07d5e250e49a8d6897c940fac8c9ae99d640e2))
* **home:** cargar categorias dinamicas en el hero y la seccion de exploracion ([d3f8404](https://github.com/moises717/Artesa_Nica/commit/d3f8404f1fb22390d659897743b0418c24a58ad5))
* **home:** redisenar hero con buscador por categorias, busqueda por voz y CTAs ([5e99b9b](https://github.com/moises717/Artesa_Nica/commit/5e99b9bd1d997cbb886a40b8ef330d32377c9e1e))
* **products:** agregar migas de pan y badges de categoria en el detalle de producto ([8006291](https://github.com/moises717/Artesa_Nica/commit/800629186b1fe6855f1699872d736f1a3bf3d0e2))
* **seller:** agregar selector multiple de categorias en el drawer de productos ([9844e98](https://github.com/moises717/Artesa_Nica/commit/9844e9804b8291008653db1b1455fb8e8d89c8e2))

## [0.1.16](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.15...artesa-nica-v0.1.16) (2026-09-27)


### Features

* **maps:** implementar calculo de rutas viales OSRM, navegacion paso a paso y tarjeta flotante con Google Maps y Waze ([16166c4](https://github.com/moises717/Artesa_Nica/commit/16166c40e742f29634bcc99958fdd84c65548954))

## [0.1.15](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.14...artesa-nica-v0.1.15) (2026-09-27)


### Features

* **products:** implementar sello de autenticidad artesanal, certificado digital con modal y copiado de codigo de verificacion ([267f458](https://github.com/moises717/Artesa_Nica/commit/267f458962c224f8c97e7b921d23b4755fedd3a0))
* **ui:** agregar componente Dialog con Radix UI, ScrollArea mejorada y optimizar modal de creacion de tienda ([8484360](https://github.com/moises717/Artesa_Nica/commit/84843601afe429514cda4a4092075bb32f9ed2b6))

## [0.1.14](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.13...artesa-nica-v0.1.14) (2026-09-27)


### Features

* **api:** soportar JSON y PATCH en /api/products/[id] para actualizaciones rapidas de inventario y estado ([3237fa6](https://github.com/moises717/Artesa_Nica/commit/3237fa687a1247da16ddf13c973a9432f0153086))
* **catalog:** agregar endpoint pb_hooks para metadatos de catalogo, indices de rendimiento y conteos por departamento ([9b1c413](https://github.com/moises717/Artesa_Nica/commit/9b1c413fb3f71e6da2b1fac82fd28028507427b1))
* **catalog:** implementar filtros avanzados por departamento, precio y ordenamiento con soporte i18n ([9899c7d](https://github.com/moises717/Artesa_Nica/commit/9899c7d0e325ddcd4adc32e4a1d8eb48559d9e55))
* **orders:** implementar pagina de confirmacion, comprobante oficial de compra y redireccion post-checkout ([de239af](https://github.com/moises717/Artesa_Nica/commit/de239afb7c91457a8cb906f0c92df6cefadba0e2))
* **seller:** agregar controles interactivos de stock rapido y conmutador de visibilidad en gestion de productos ([4100115](https://github.com/moises717/Artesa_Nica/commit/4100115d30a487eebe8cf7eb9c10e358b8860a3f))
* **ui:** agregar componente Select basado en Radix UI y corregir layout shift en scroll lock ([2e79300](https://github.com/moises717/Artesa_Nica/commit/2e79300aa96ea554654067e98d24589d023ce50b))

## [0.1.13](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.12...artesa-nica-v0.1.13) (2026-09-27)


### Features

* **maps:** optimizar rendimiento interactivo, estado de marcadores, debouncing y experiencia móvil ([7a73656](https://github.com/moises717/Artesa_Nica/commit/7a7365652ec611cf061c802e33fbe770450a7e4f))


### Bug Fixes

* **resilience:** agregar pagina 500 y manejo de errores con fallback en HomeContent ([84c2d86](https://github.com/moises717/Artesa_Nica/commit/84c2d8652af3a4b84bf40e38c56b7ffa72e0bfeb))

## [0.1.12](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.11...artesa-nica-v0.1.12) (2026-08-14)


### Bug Fixes

* **header:** corregir marca ArtesáNica y reindentar drawer movil ([547a06d](https://github.com/moises717/Artesa_Nica/commit/547a06d39274e2e2dc1103f3193c9ecd890cce74))
* **profile:** ajustar sidebar dark y boton de contraseña a tokens ([4982302](https://github.com/moises717/Artesa_Nica/commit/49823022d97dc8640688296f0b41b7f5afd1b386))
* **ui:** usar text-white sobre fondos de color en vez de text-blanco ([a7b4eeb](https://github.com/moises717/Artesa_Nica/commit/a7b4eebb38a27779d76ec1527e686cd40a3e9267))

## [0.1.11](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.10...artesa-nica-v0.1.11) (2026-08-14)


### Features

* **api:** mensaje de validacion para email invalido ([63593ef](https://github.com/moises717/Artesa_Nica/commit/63593ef49469c2578892a4140447dd5c71747adb))
* **theme:** paleta de marca terracota, azul anil y ocre en tokens ([636e6bd](https://github.com/moises717/Artesa_Nica/commit/636e6bd3d06acc87339def703e0e4df411e1d136))


### Bug Fixes

* **auth:** refrescar sesion y carrito en cada navegacion ([e1122fc](https://github.com/moises717/Artesa_Nica/commit/e1122fc5b447d23a4c75cb6d25b3a4c2657179f2))
* **hooks:** ordenar tiendas de forma inmutable ([d394edc](https://github.com/moises717/Artesa_Nica/commit/d394edc46a59fc1ce100ff66d0e998c01ad9ad1f))


### Performance Improvements

* **maps:** estabilizar handlers, iconos y efectos de geolocalizacion ([cb979de](https://github.com/moises717/Artesa_Nica/commit/cb979dec6363001b4965f143e08ed1957dbc9835))
* **pocketbase:** resolver URL activa de forma sincrona en interceptor ([74a07c7](https://github.com/moises717/Artesa_Nica/commit/74a07c7683c3f733cd5be59a5d9396581a2d018a))

## [0.1.10](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.9...artesa-nica-v0.1.10) (2026-08-13)


### Features

* **api:** endpoint stores/mine y simplificar carga de tienda en perfil ([27fef06](https://github.com/moises717/Artesa_Nica/commit/27fef069a298fc4f8e29cfd642567fd4e2fb3ef8))
* **cart:** sincronizar cambios con backend via cola debounced ([d49a3de](https://github.com/moises717/Artesa_Nica/commit/d49a3de924b6c947d3d76830a1d86c3609db7c3b))
* **profile:** skeleton de carga y tabs mobile con auto-scroll ([e7576d7](https://github.com/moises717/Artesa_Nica/commit/e7576d7001fe71c2ed86bfc26d11188ffdc297e8))
* **ui:** agregar componente Skeleton y ProductCardSkeleton ([d85a6ee](https://github.com/moises717/Artesa_Nica/commit/d85a6ee9b0bbfb8daeb4f980f8cace1c380bc2af))


### Bug Fixes

* **auth:** deduplicar refreshAuth en vuelo y consumir authUser en Reviews ([b29db11](https://github.com/moises717/Artesa_Nica/commit/b29db112b6211191e58388784b5239f2bd6ab864))
* **build:** pre-bundle deps de React y mapa en Vite ([96f26fa](https://github.com/moises717/Artesa_Nica/commit/96f26faebabe7fe06ac5e9559a63d73be724e099))
* **footer:** aplicar dark mode con paleta slate y hover emerald ([9398378](https://github.com/moises717/Artesa_Nica/commit/9398378527fa6a332b42d67ade077647d042f651))
* **home:** agregar variantes dark mode a categorias y ruta artesanal ([2af7571](https://github.com/moises717/Artesa_Nica/commit/2af7571beeb8114b8c38ceb851542d37b0e7f492))
* **maps:** snap determinista del bottom sheet segun punto medio ([104796e](https://github.com/moises717/Artesa_Nica/commit/104796ecca829d1f0faf830e87ff926a7019140f))
* **pocketbase:** migrar auth de admin a superusuarios con autoRefresh ([de11268](https://github.com/moises717/Artesa_Nica/commit/de112688e0c26f0f4b51a982aa250f030e82ebcb))

## [0.1.9](https://github.com/moises717/Artesa_Nica/compare/artesa-nica-v0.1.8...artesa-nica-v0.1.9) (2026-08-13)


### Features

* **api:** add product CRUD and owner-filtered listing ([cce11d5](https://github.com/moises717/Artesa_Nica/commit/cce11d507d15f9e31ce712dda53851a3eacf5c6d))
* **api:** add store creation with auto-seller promotion ([db31fec](https://github.com/moises717/Artesa_Nica/commit/db31fec50a8f85449ed99e2078e8920fc043891b))
* **api:** add user profile, avatar, and dashboard endpoints ([da87ae1](https://github.com/moises717/Artesa_Nica/commit/da87ae171498b2a266c7938e7eb06cf0a1afc993))
* **artesa-nica:** astro 7 + pocketbase adoption ([9278c1e](https://github.com/moises717/Artesa_Nica/commit/9278c1e8c3f946b8d23e18ad8fb430f5cf8d16ec))
* **auth:** apply enter animations to panel, form and banners ([28cf2dc](https://github.com/moises717/Artesa_Nica/commit/28cf2dc089bbf8d6ba420b03978ae9d4922b7cc0))
* **auth:** CSS keyframes replicating NicaExplora entry animation ([a0d6010](https://github.com/moises717/Artesa_Nica/commit/a0d601047c216f0d839070b584440c9612d6f379))
* **auth:** forgot-password + reset-password pages ([2413c9d](https://github.com/moises717/Artesa_Nica/commit/2413c9d0de66a4568e79de3ed82bd0e938e5cc54))
* **auth:** forgot/reset/verify/change-password endpoints ([679a2fe](https://github.com/moises717/Artesa_Nica/commit/679a2fe4c57e44ecd50ac31a3ddf5380e67ebd1c))
* **auth:** full-bleed image panel with green filter overlay ([1eeca53](https://github.com/moises717/Artesa_Nica/commit/1eeca535774868dbff7fb2ed67ae57223d84b424))
* **auth:** harden login/register/logout/me endpoints ([aa4196c](https://github.com/moises717/Artesa_Nica/commit/aa4196c26b14bc385945e605641eab638540bcc1))
* **auth:** middleware + per-request PB + cookie/csrf/refresh/guards helpers ([3f108b5](https://github.com/moises717/Artesa_Nica/commit/3f108b57a5f4881ce16c1f23d40d563d96b1607b))
* **auth:** NicaExplora-inspired login layout ([76dc5ee](https://github.com/moises717/Artesa_Nica/commit/76dc5ee1c3b5d1f4f1536ee75dccbd1c5e27696a))
* **auth:** NicaExplora-inspired register layout ([9567df0](https://github.com/moises717/Artesa_Nica/commit/9567df0b7adc7f5ff97c294b9a552e58ea8df0fe))
* **auth:** PB rate-limit migration + auth-refresh audit hook ([e386d1f](https://github.com/moises717/Artesa_Nica/commit/e386d1ff9e6582c06965c630da2f9605d92f5627))
* **auth:** redesign login page with split layout ([70d0385](https://github.com/moises717/Artesa_Nica/commit/70d0385dce247bb965f691f53b7210383b696dbc))
* **auth:** redesign register page with split layout ([3b14212](https://github.com/moises717/Artesa_Nica/commit/3b14212c5944c463e7c084cf3ecbb2b360ee3752))
* **auth:** shared AuthPanel visual component ([d51b124](https://github.com/moises717/Artesa_Nica/commit/d51b124e0c702f4ead497a58438b708fcad1bf88))
* **auth:** SSR guards on /perfil, /carrito, /login, /registro ([69f451e](https://github.com/moises717/Artesa_Nica/commit/69f451e9aa84197f8e0ce48624669e8befdc060d))
* **auth:** subtle blur on AuthPanel background image + saturated overlay ([ce08032](https://github.com/moises717/Artesa_Nica/commit/ce08032f4a5c84aebba579bd7c67f155ab1c5975))
* **auth:** switch login and registro to AuthLayout ([baf6a50](https://github.com/moises717/Artesa_Nica/commit/baf6a50024ef44b74196bf65498eab9b07392da3))
* **base:** fullbleed variant in BaseLayout + hidden prop in Header ([f307c90](https://github.com/moises717/Artesa_Nica/commit/f307c90c66ba88de2a440aaca6930e7b5d88e384))
* **brand:** integrar nuevo logo oficial y variantes (Blanco, Negro, Grises) ([e363259](https://github.com/moises717/Artesa_Nica/commit/e363259d4c3fa67a0fdac1623cc65fd66b4b5c0e))
* **cart:** implementar checkout con modal y envio por WhatsApp ([c4f2037](https://github.com/moises717/Artesa_Nica/commit/c4f20379f4decfa31c5e69693b4b5ecda2f789d4))
* **cart:** notificar por toast al agregar productos al carrito ([730f151](https://github.com/moises717/Artesa_Nica/commit/730f1516bcc9c7d86657f5b49e20c69143b68208))
* **geo:** add geoPoint + department schema foundation (PR [#1](https://github.com/moises717/Artesa_Nica/issues/1)/3) ([6f4e124](https://github.com/moises717/Artesa_Nica/commit/6f4e12434f76a8102fff3f7c04010d0688c716dd))
* **geo:** onboarding map + department select (PR [#2](https://github.com/moises717/Artesa_Nica/issues/2)/3) ([62b6c35](https://github.com/moises717/Artesa_Nica/commit/62b6c35041a77934bae81d0a235146ab5d577579))
* **geo:** public mapa + nearby widget (PR [#3](https://github.com/moises717/Artesa_Nica/issues/3)/3) ([4448366](https://github.com/moises717/Artesa_Nica/commit/4448366db556a06d998d13b98ed513578c9ad9cc))
* **header:** active link state + rolling animation for mobile nav ([db8b3b1](https://github.com/moises717/Artesa_Nica/commit/db8b3b1e90a37372937ef1f501422fb21d67d6bc))
* **header:** add 'Mi tienda' menu item for sellers in auth dropdown ([ebbb5df](https://github.com/moises717/Artesa_Nica/commit/ebbb5df045b74b5d9cd363a98f4f8a77b645b79e))
* **header:** add mobile bottom nav with raised home circle ([a4d5210](https://github.com/moises717/Artesa_Nica/commit/a4d5210957661343077915f0956e6aebc7f7c191))
* **header:** agregar barra de navegacion movil con selector de idioma ([6f4d5b5](https://github.com/moises717/Artesa_Nica/commit/6f4d5b5fa27eba9e58c083cf2e1970282ac4e821))
* **header:** agregar drawer lateral movil con navegacion, auth y preferencias ([f885d9b](https://github.com/moises717/Artesa_Nica/commit/f885d9b55768864a930802c4d858707ebacc36de))
* **header:** auth-aware nav with shadcn dropdown ([8e7e75c](https://github.com/moises717/Artesa_Nica/commit/8e7e75c502106f51fc0c6af10d2e4c49ddab1b49))
* **header:** envolver cuerpo del drawer movil en ScrollArea ([a41de5c](https://github.com/moises717/Artesa_Nica/commit/a41de5c4bab0baace32df074e3b0f6dd29f67f09))
* **header:** redesigned HeaderAuthMenu with avatar URL, no shadcn Button dep ([a9bcfa2](https://github.com/moises717/Artesa_Nica/commit/a9bcfa217cbc1534366ba4d40ccb56ae6746e694))
* **home:** redesign product/store cards with ratings, badges, and hover effects ([9f74b3d](https://github.com/moises717/Artesa_Nica/commit/9f74b3df0f146a6f998d502b2a9cc9949cf73f7a))
* **home:** rediseñar hero section con blobs decorativos y mejor espaciado ([197b2d5](https://github.com/moises717/Artesa_Nica/commit/197b2d590ad6ccd539f8ba61104814f1e8b8d92e))
* **home:** redisenar hero, agregar seccion de historia y categorias visuales ([250d9aa](https://github.com/moises717/Artesa_Nica/commit/250d9aa3c6b71a94d00ad2262cbc814c1799bc03))
* **home:** reemplazar seccion de historia con proceso artesanal y ruta de pueblos ([ec7997a](https://github.com/moises717/Artesa_Nica/commit/ec7997a5b62321bab8585bd5b3dd25e715ad4687))
* **i18n:** add en/es bilingual support with Astro i18n ([6cad284](https://github.com/moises717/Artesa_Nica/commit/6cad284b71e6c880627cf59259cb6d542453c4df))
* **i18n:** agregar páginas forgot/reset password para locale en ([4af679e](https://github.com/moises717/Artesa_Nica/commit/4af679e713ea582f53153bd8e5f2a6ced471d863))
* **i18n:** auth.forgotPassword, reset, verify, change-password keys ([90f1b50](https://github.com/moises717/Artesa_Nica/commit/90f1b50c015eab2650d2fe92fa1ab0196960b6c1))
* **icons:** migrate FontAwesome CDN to astro-icon + Lucide ([77d42c8](https://github.com/moises717/Artesa_Nica/commit/77d42c80e9f8495e4c34a12a96e9d0b0d4ecabfe))
* **layout:** AuthLayout without global header/footer ([7057092](https://github.com/moises717/Artesa_Nica/commit/7057092b7a01329135283a9003c3ddfbe129fa7c))
* **map:** full-bleed map with MapExperience, sidebar, bottom sheet, store popups ([3c26dab](https://github.com/moises717/Artesa_Nica/commit/3c26dabd6045daaf93859b41fb9d42e42ff82242))
* **news:** agregar coleccion, migracion y seeds de noticias ([cef8851](https://github.com/moises717/Artesa_Nica/commit/cef8851b4c393612c9cf8bd71769126f06d6d9ef))
* **news:** implementar listado y vista detallada de noticias ([38be755](https://github.com/moises717/Artesa_Nica/commit/38be7555fd8f1308dae8ff117cf98fca3f3adb7c))
* **pb:** add created_at/updated_at autodate fields to all collections ([5477244](https://github.com/moises717/Artesa_Nica/commit/54772444d3ce0f26b3bd88ad2494304d54065be1))
* **pb:** add orders stock validation beforeCreate hook ([8ffa665](https://github.com/moises717/Artesa_Nica/commit/8ffa665599078fc2dc45d824d7a02d80cf1a088f))
* **pb:** add reviews unique index, user_name_snapshot, and rating sync hook ([9e1a50a](https://github.com/moises717/Artesa_Nica/commit/9e1a50af34539dc2288cd9b8fb2b7bcf57e6246b))
* **pocketbase:** implementar sistema de fallback de URL con deteccion automatica ([9b2d7b5](https://github.com/moises717/Artesa_Nica/commit/9b2d7b57497a3274813e674dbfa017d1e23b2567))
* **profile:** add full profile with sidebar tabs and 6 sections ([dd680b7](https://github.com/moises717/Artesa_Nica/commit/dd680b7b3aa9e05ef485197f1b35237fa8cbe239))
* **reviews:** add Reviews component, API endpoint, and i18n ([7342c5c](https://github.com/moises717/Artesa_Nica/commit/7342c5c4ce1f8077e9e04bf74d4ac48bbfda4e67))
* **security:** CSP, HSTS, X-Frame-Options, Permissions-Policy headers ([d48ff94](https://github.com/moises717/Artesa_Nica/commit/d48ff944361a7bae24a4dec6e8a6ac7a03f6dca8))
* **styles:** añadir scrollbar personalizado con colores de marca ([706b0cd](https://github.com/moises717/Artesa_Nica/commit/706b0cda58ff34d0784ada8f7908b4b4d255809a))
* **tailwind:** migrate to Tailwind CSS v4 with [@theme](https://github.com/theme) design tokens ([c82ba35](https://github.com/moises717/Artesa_Nica/commit/c82ba352bebfd6786b1e2b8d5ed814917f841c05))
* **theme:** implementar dark mode con View Transition API reveal y FOUC prevention ([551872d](https://github.com/moises717/Artesa_Nica/commit/551872d698744d4ea8e1a76c28dc9f44a9b3808d))
* **toast:** agregar sistema de notificaciones toast global ([e924482](https://github.com/moises717/Artesa_Nica/commit/e924482fbfb8d88d3bf8e5c13dd5e6b1c2ba8ecd))
* **ui:** add drawer slide-in animation to global CSS ([e791c1b](https://github.com/moises717/Artesa_Nica/commit/e791c1bf166afe7376ea7a64f0bfb357935f8e46))


### Bug Fixes

* **api:** replace -[@rowid](https://github.com/rowid) sort with -created_at for PB 0.27 compat ([0fc219d](https://github.com/moises717/Artesa_Nica/commit/0fc219d31e4b0d58611dfb6e0d635178425ab825))
* **auth:** align pb_auth cookie format with PocketBase SDK 0.27 ([34c7d91](https://github.com/moises717/Artesa_Nica/commit/34c7d9114933aff8cc05594389527444c6ef1704))
* **auth:** align pb_auth cookie format with PocketBase SDK 0.27 ([c9c207c](https://github.com/moises717/Artesa_Nica/commit/c9c207c60a6ef783678baed2ba2f29e4ebd05d3d))
* **auth:** drop HttpOnly from csrf-token cookie ([318a28d](https://github.com/moises717/Artesa_Nica/commit/318a28d7aa9e23c0615d828c927b72a1b86274da))
* **auth:** emailVerified i18n keys, login verify banner, cookie rewrite on refresh ([14b1500](https://github.com/moises717/Artesa_Nica/commit/14b1500f6069fdb711171079f48d54bd08d0606b))
* **auth:** hacer route guards i18n-aware para prefijo en/es ([264cc51](https://github.com/moises717/Artesa_Nica/commit/264cc516b2021e638ff05260774889c5ade0332a))
* **auth:** include request origin in CSRF allowlist + send x-csrf-token from store ([604f6ef](https://github.com/moises717/Artesa_Nica/commit/604f6efda7b008538eacb8d6ec9b2f05cc1000af))
* **auth:** make login form client-only, remove server-side POST fallback ([5849971](https://github.com/moises717/Artesa_Nica/commit/5849971ab077342a2058f84fa91120eda7d6a638))
* **auth:** make login form client-only, remove server-side POST fallback ([14848e7](https://github.com/moises717/Artesa_Nica/commit/14848e78444ce631b6de6d13556801c4ca2bdc07))
* **auth:** pocketbaseFor uses server-side POCKETBASE_URL, not PUBLIC_* ([43d4730](https://github.com/moises717/Artesa_Nica/commit/43d47301cc4bb6883b5842faa17f1d02aea06bff))
* **auth:** pocketbaseFor uses server-side POCKETBASE_URL, not PUBLIC_* ([15ca6fe](https://github.com/moises717/Artesa_Nica/commit/15ca6fea664f6dc2e6ade861cad695ee50985763))
* **auth:** server sets role=user explicitly on register ([2360488](https://github.com/moises717/Artesa_Nica/commit/2360488408af1c4cdccd1fd996c7b383af013303))
* **auth:** set default role on register endpoint ([ae7d4f9](https://github.com/moises717/Artesa_Nica/commit/ae7d4f960f2c8bbd55ef37dde91d76850e0d533d))
* **auth:** tighten LoginContent script types and align en routes to AuthLayout ([330d65d](https://github.com/moises717/Artesa_Nica/commit/330d65deaf8f8c98485b080e99913959dcbc7038))
* **auth:** tighten LoginContent script types and align en routes to AuthLayout ([339489e](https://github.com/moises717/Artesa_Nica/commit/339489e38617903efccc203a0751cbad2a0ec04d))
* **auth:** use PB SDK loadFromCookie instead of manual cookie parsing ([ce294c0](https://github.com/moises717/Artesa_Nica/commit/ce294c071183540f7bbb6dc13a259b761abe84cd))
* **auth:** wrap form scripts in init functions, listen to astro:page-load ([48b6267](https://github.com/moises717/Artesa_Nica/commit/48b62673a013712df5be3fc15f32674af3ba2ad1))
* **cart:** sanitizar filtros PocketBase usando pb.filter() en lugar de interpolacion de strings ([97bb1dc](https://github.com/moises717/Artesa_Nica/commit/97bb1dc2866fea60077ed8ce6621558fb85f17e2))
* **config:** add blob: to CSP img-src and pre-bundle map deps ([3539ed7](https://github.com/moises717/Artesa_Nica/commit/3539ed78214d3fcf2de7787bea3f974751f8b120))
* **csp:** allow PocketBase origin in img-src ([8325eda](https://github.com/moises717/Artesa_Nica/commit/8325eda9aab0e4d50be98a985dbbe868fa8f2c76))
* **csp:** allow self-framing for dev/preview tools ([190def9](https://github.com/moises717/Artesa_Nica/commit/190def93c2f6218325ba566d161a7a53decf76c7))
* **geo:** add Mapa link to mobile bottom nav (S1 verify finding) ([dac017d](https://github.com/moises717/Artesa_Nica/commit/dac017d6380e52fa9c5ba81c4dd9d6083bff1c6c))
* **geo:** use findCollectionByNameOrId in store geo migration ([5416b3d](https://github.com/moises717/Artesa_Nica/commit/5416b3d4f5e03dfa8803d9c445f517faf2e88a69))
* **header:** dropdown z-index over map and email break-all instead of truncate ([d713edd](https://github.com/moises717/Artesa_Nica/commit/d713eddeb69f4afb7749c58f253c14615283ee30))
* **header:** enlarge navbar brand, icons, and labels ([0ddf737](https://github.com/moises717/Artesa_Nica/commit/0ddf73716ac644029ee0aacb521f7d0034bb205f))
* **header:** hide duplicate active icon + tame curve-out tabs ([226a387](https://github.com/moises717/Artesa_Nica/commit/226a387457de278f57336183ae90d0c4224fb2c6))
* **header:** increase gap between nav items from gap-6 to gap-10 ([d488d84](https://github.com/moises717/Artesa_Nica/commit/d488d84ed0f3e85df211f248e82957a9fad0e83f))
* **header:** persist Header across view transitions to avoid nav duplicate ([91fae78](https://github.com/moises717/Artesa_Nica/commit/91fae789e69dc009f8440ce89256ebacd581208c))
* **header:** remove curve-out ::before/::after tabs ([5788758](https://github.com/moises717/Artesa_Nica/commit/578875845ccbc75fee43ae31eb8153a69c4aa8cf))
* **header:** rewrite mobile nav CSS to match Magic Navigation design ([4b83357](https://github.com/moises717/Artesa_Nica/commit/4b83357ac9878bedafded04cb801be1e2b57cc09))
* **header:** simplify mobile avatar trigger and remove label from desktop variant ([e99bb30](https://github.com/moises717/Artesa_Nica/commit/e99bb30c636b84313b98e3f7d7f79ef86e0a9b55))
* **header:** use client:only to avoid hydration mismatch ([66949c1](https://github.com/moises717/Artesa_Nica/commit/66949c137d69275b33909a6f5cb84374b13bc23b))
* **login:** server-side fallback para POST + script defensivo ([a20be6a](https://github.com/moises717/Artesa_Nica/commit/a20be6aedd78c0cb585d85d42dfbbd48010907db))
* **login:** server-side fallback para POST + script defensivo ([625d60d](https://github.com/moises717/Artesa_Nica/commit/625d60d90d4ca8ae64fa07e1d503a1d386c593e7))
* **mapa:en:** same sort=-id and error logging as es version ([7b6401e](https://github.com/moises717/Artesa_Nica/commit/7b6401e14288e99d827eca390a0a73b866ac3ddf))
* **mapa:** add loading fallback for StoreClusterMap island ([71ac2cf](https://github.com/moises717/Artesa_Nica/commit/71ac2cf651bfb10eccb6aa6cbe433783110c1c8c))
* **mapa:** always render map even when stores empty + add geo seed script ([53e5594](https://github.com/moises717/Artesa_Nica/commit/53e5594e5a024ce6c8b7fad63b21497da3f130b3))
* **mapa:** log PB fetch errors instead of silently swallowing ([66e7150](https://github.com/moises717/Artesa_Nica/commit/66e7150366bb861e841d946283551a1d5881992c))
* **mapa:** sort by -id instead of -created (PB 0.27 system field quirk) ([ebafc9a](https://github.com/moises717/Artesa_Nica/commit/ebafc9a77162e97afa6f5f2c13470e08e00b9a3a))
* **map:** importar modulo de markercluster ([456451d](https://github.com/moises717/Artesa_Nica/commit/456451d1df0bc0f01e6a017dcb4ff9f242ed864f))
* **maps:** corregir carga de MarkerCluster en MapCanvas ([c8f535b](https://github.com/moises717/Artesa_Nica/commit/c8f535b41a89bd3af364c9b3b2c4543c3f346b12))
* **pb:** exclude dev IP from rate limits ([1fad822](https://github.com/moises717/Artesa_Nica/commit/1fad822070d6b4666bdea0aee957ca6708567124))
* **pb:** restrict products listRule/viewRule to published only ([887d570](https://github.com/moises717/Artesa_Nica/commit/887d5702b8661461d88369011fa9d165e331c9f4))
* **pb:** two-step migration to recover from partial geoPoint schema migration ([9bb74bf](https://github.com/moises717/Artesa_Nica/commit/9bb74bf7fc3ab50a68151d62dee0e5de9822d25b))
* **pocketbase:** actualizar URL de PocketBase a la versión de producción ([7418090](https://github.com/moises717/Artesa_Nica/commit/74180907728dd4519da6be7d39b42fec39325013))
* **pocketbase:** aislar cliente admin del singleton publico para evitar contaminacion de auth ([52b666c](https://github.com/moises717/Artesa_Nica/commit/52b666c8de25bb77264910a50d2e596f10833d53))
* **seed:** auto-load .env file when admin password not in env ([7615cec](https://github.com/moises717/Artesa_Nica/commit/7615cec4bb5c2f7e8c7a130807de8f42d66f8ebb))
* **tailwind:** restore visual fidelity to legacy design ([3b538cb](https://github.com/moises717/Artesa_Nica/commit/3b538cbf78f126386a08478c5bfa827e680ca329))
* **theme:** persist dark mode after SPA navigations via astro:after-swap ([cfd38cd](https://github.com/moises717/Artesa_Nica/commit/cfd38cdf1c41d2220f02b7bd5c090e370627f64d))
* **ui:** prevenir layout shift al abrir dropdowns y refinar scrollbars ([4f138c1](https://github.com/moises717/Artesa_Nica/commit/4f138c1a41c3cd54c6ba264aa3fd5dde0074ccfb))
* Update total purchases calculation to show correct amount from user's purchase history ([dd800b2](https://github.com/moises717/Artesa_Nica/commit/dd800b2e0c8bbf6ba0fff03f682133bd69c95151))

## [0.1.8](https://github.com/moises717/Artesa_Nica/compare/v0.1.7...v0.1.8) (2026-08-11)

### Features

* **brand:** integrar nuevo logo oficial y variantes en alta resolución (Blanco, Negro, Grises) ([e363259](https://github.com/moises717/Artesa_Nica/commit/e363259))

## [0.1.7](https://github.com/fabrifj07/Artesa_Nica/compare/artesa-nica-v0.1.6...artesa-nica-v0.1.7) (2026-08-10)


### Features

* **header:** agregar barra de navegacion movil con selector de idioma ([6f4d5b5](https://github.com/fabrifj07/Artesa_Nica/commit/6f4d5b5fa27eba9e58c083cf2e1970282ac4e821))
* **home:** redisenar hero, agregar seccion de historia y categorias visuales ([250d9aa](https://github.com/fabrifj07/Artesa_Nica/commit/250d9aa3c6b71a94d00ad2262cbc814c1799bc03))
* **pocketbase:** implementar sistema de fallback de URL con deteccion automatica ([9b2d7b5](https://github.com/fabrifj07/Artesa_Nica/commit/9b2d7b57497a3274813e674dbfa017d1e23b2567))


### Bug Fixes

* **maps:** corregir carga de MarkerCluster en MapCanvas ([c8f535b](https://github.com/fabrifj07/Artesa_Nica/commit/c8f535b41a89bd3af364c9b3b2c4543c3f346b12))

## [0.1.6](https://github.com/fabrifj07/Artesa_Nica/compare/artesa-nica-v0.1.5...artesa-nica-v0.1.6) (2026-08-06)


### Features

* **news:** agregar coleccion, migracion y seeds de noticias ([cef8851](https://github.com/fabrifj07/Artesa_Nica/commit/cef8851b4c393612c9cf8bd71769126f06d6d9ef))
* **news:** implementar listado y vista detallada de noticias ([38be755](https://github.com/fabrifj07/Artesa_Nica/commit/38be7555fd8f1308dae8ff117cf98fca3f3adb7c))


### Bug Fixes

* **map:** importar modulo de markercluster ([456451d](https://github.com/fabrifj07/Artesa_Nica/commit/456451d1df0bc0f01e6a017dcb4ff9f242ed864f))
* **pocketbase:** actualizar URL de PocketBase a la versión de producción ([7418090](https://github.com/fabrifj07/Artesa_Nica/commit/74180907728dd4519da6be7d39b42fec39325013))

## [0.1.5](https://github.com/fabrifj07/Artesa_Nica/compare/artesa-nica-v0.1.4...artesa-nica-v0.1.5) (2026-06-29)


### Features

* **api:** add product CRUD and owner-filtered listing ([cce11d5](https://github.com/fabrifj07/Artesa_Nica/commit/cce11d507d15f9e31ce712dda53851a3eacf5c6d))
* **api:** add store creation with auto-seller promotion ([db31fec](https://github.com/fabrifj07/Artesa_Nica/commit/db31fec50a8f85449ed99e2078e8920fc043891b))
* **api:** add user profile, avatar, and dashboard endpoints ([da87ae1](https://github.com/fabrifj07/Artesa_Nica/commit/da87ae171498b2a266c7938e7eb06cf0a1afc993))
* **header:** add 'Mi tienda' menu item for sellers in auth dropdown ([ebbb5df](https://github.com/fabrifj07/Artesa_Nica/commit/ebbb5df045b74b5d9cd363a98f4f8a77b645b79e))
* **home:** redesign product/store cards with ratings, badges, and hover effects ([9f74b3d](https://github.com/fabrifj07/Artesa_Nica/commit/9f74b3df0f146a6f998d502b2a9cc9949cf73f7a))
* **pb:** add created_at/updated_at autodate fields to all collections ([5477244](https://github.com/fabrifj07/Artesa_Nica/commit/54772444d3ce0f26b3bd88ad2494304d54065be1))
* **pb:** add orders stock validation beforeCreate hook ([8ffa665](https://github.com/fabrifj07/Artesa_Nica/commit/8ffa665599078fc2dc45d824d7a02d80cf1a088f))
* **pb:** add reviews unique index, user_name_snapshot, and rating sync hook ([9e1a50a](https://github.com/fabrifj07/Artesa_Nica/commit/9e1a50af34539dc2288cd9b8fb2b7bcf57e6246b))
* **profile:** add full profile with sidebar tabs and 6 sections ([dd680b7](https://github.com/fabrifj07/Artesa_Nica/commit/dd680b7b3aa9e05ef485197f1b35237fa8cbe239))
* **reviews:** add Reviews component, API endpoint, and i18n ([7342c5c](https://github.com/fabrifj07/Artesa_Nica/commit/7342c5c4ce1f8077e9e04bf74d4ac48bbfda4e67))
* **ui:** add drawer slide-in animation to global CSS ([e791c1b](https://github.com/fabrifj07/Artesa_Nica/commit/e791c1bf166afe7376ea7a64f0bfb357935f8e46))


### Bug Fixes

* **api:** replace -[@rowid](https://github.com/rowid) sort with -created_at for PB 0.27 compat ([0fc219d](https://github.com/fabrifj07/Artesa_Nica/commit/0fc219d31e4b0d58611dfb6e0d635178425ab825))
* **auth:** use PB SDK loadFromCookie instead of manual cookie parsing ([ce294c0](https://github.com/fabrifj07/Artesa_Nica/commit/ce294c071183540f7bbb6dc13a259b761abe84cd))
* **config:** add blob: to CSP img-src and pre-bundle map deps ([3539ed7](https://github.com/fabrifj07/Artesa_Nica/commit/3539ed78214d3fcf2de7787bea3f974751f8b120))
* **pb:** exclude dev IP from rate limits ([1fad822](https://github.com/fabrifj07/Artesa_Nica/commit/1fad822070d6b4666bdea0aee957ca6708567124))
* **pb:** restrict products listRule/viewRule to published only ([887d570](https://github.com/fabrifj07/Artesa_Nica/commit/887d5702b8661461d88369011fa9d165e331c9f4))

## [0.1.4](https://github.com/fabrifj07/Artesa_Nica/compare/artesa-nica-v0.1.3...artesa-nica-v0.1.4) (2026-06-28)


### Features

* **base:** fullbleed variant in BaseLayout + hidden prop in Header ([f307c90](https://github.com/fabrifj07/Artesa_Nica/commit/f307c90c66ba88de2a440aaca6930e7b5d88e384))
* **geo:** add geoPoint + department schema foundation (PR [#1](https://github.com/fabrifj07/Artesa_Nica/issues/1)/3) ([6f4e124](https://github.com/fabrifj07/Artesa_Nica/commit/6f4e12434f76a8102fff3f7c04010d0688c716dd))
* **geo:** onboarding map + department select (PR [#2](https://github.com/fabrifj07/Artesa_Nica/issues/2)/3) ([62b6c35](https://github.com/fabrifj07/Artesa_Nica/commit/62b6c35041a77934bae81d0a235146ab5d577579))
* **geo:** public mapa + nearby widget (PR [#3](https://github.com/fabrifj07/Artesa_Nica/issues/3)/3) ([4448366](https://github.com/fabrifj07/Artesa_Nica/commit/4448366db556a06d998d13b98ed513578c9ad9cc))
* **map:** full-bleed map with MapExperience, sidebar, bottom sheet, store popups ([3c26dab](https://github.com/fabrifj07/Artesa_Nica/commit/3c26dabd6045daaf93859b41fb9d42e42ff82242))


### Bug Fixes

* **csp:** allow self-framing for dev/preview tools ([190def9](https://github.com/fabrifj07/Artesa_Nica/commit/190def93c2f6218325ba566d161a7a53decf76c7))
* **geo:** add Mapa link to mobile bottom nav (S1 verify finding) ([dac017d](https://github.com/fabrifj07/Artesa_Nica/commit/dac017d6380e52fa9c5ba81c4dd9d6083bff1c6c))
* **geo:** use findCollectionByNameOrId in store geo migration ([5416b3d](https://github.com/fabrifj07/Artesa_Nica/commit/5416b3d4f5e03dfa8803d9c445f517faf2e88a69))
* **header:** dropdown z-index over map and email break-all instead of truncate ([d713edd](https://github.com/fabrifj07/Artesa_Nica/commit/d713eddeb69f4afb7749c58f253c14615283ee30))
* **header:** simplify mobile avatar trigger and remove label from desktop variant ([e99bb30](https://github.com/fabrifj07/Artesa_Nica/commit/e99bb30c636b84313b98e3f7d7f79ef86e0a9b55))
* **header:** use client:only to avoid hydration mismatch ([66949c1](https://github.com/fabrifj07/Artesa_Nica/commit/66949c137d69275b33909a6f5cb84374b13bc23b))
* **mapa:en:** same sort=-id and error logging as es version ([7b6401e](https://github.com/fabrifj07/Artesa_Nica/commit/7b6401e14288e99d827eca390a0a73b866ac3ddf))
* **mapa:** add loading fallback for StoreClusterMap island ([71ac2cf](https://github.com/fabrifj07/Artesa_Nica/commit/71ac2cf651bfb10eccb6aa6cbe433783110c1c8c))
* **mapa:** always render map even when stores empty + add geo seed script ([53e5594](https://github.com/fabrifj07/Artesa_Nica/commit/53e5594e5a024ce6c8b7fad63b21497da3f130b3))
* **mapa:** log PB fetch errors instead of silently swallowing ([66e7150](https://github.com/fabrifj07/Artesa_Nica/commit/66e7150366bb861e841d946283551a1d5881992c))
* **mapa:** sort by -id instead of -created (PB 0.27 system field quirk) ([ebafc9a](https://github.com/fabrifj07/Artesa_Nica/commit/ebafc9a77162e97afa6f5f2c13470e08e00b9a3a))
* **pb:** two-step migration to recover from partial geoPoint schema migration ([9bb74bf](https://github.com/fabrifj07/Artesa_Nica/commit/9bb74bf7fc3ab50a68151d62dee0e5de9822d25b))
* **seed:** auto-load .env file when admin password not in env ([7615cec](https://github.com/fabrifj07/Artesa_Nica/commit/7615cec4bb5c2f7e8c7a130807de8f42d66f8ebb))

## [0.1.3](https://github.com/fabrifj07/Artesa_Nica/compare/artesa-nica-v0.1.2...artesa-nica-v0.1.3) (2026-06-27)


### Features

* **header:** auth-aware nav with shadcn dropdown ([8e7e75c](https://github.com/fabrifj07/Artesa_Nica/commit/8e7e75c502106f51fc0c6af10d2e4c49ddab1b49))
* **header:** redesigned HeaderAuthMenu with avatar URL, no shadcn Button dep ([a9bcfa2](https://github.com/fabrifj07/Artesa_Nica/commit/a9bcfa217cbc1534366ba4d40ccb56ae6746e694))


### Bug Fixes

* **auth:** server sets role=user explicitly on register ([2360488](https://github.com/fabrifj07/Artesa_Nica/commit/2360488408af1c4cdccd1fd996c7b383af013303))
* **auth:** wrap form scripts in init functions, listen to astro:page-load ([48b6267](https://github.com/fabrifj07/Artesa_Nica/commit/48b62673a013712df5be3fc15f32674af3ba2ad1))
* **csp:** allow PocketBase origin in img-src ([8325eda](https://github.com/fabrifj07/Artesa_Nica/commit/8325eda9aab0e4d50be98a985dbbe868fa8f2c76))
* **theme:** persist dark mode after SPA navigations via astro:after-swap ([cfd38cd](https://github.com/fabrifj07/Artesa_Nica/commit/cfd38cdf1c41d2220f02b7bd5c090e370627f64d))

## [0.1.2](https://github.com/fabrifj07/Artesa_Nica/compare/artesa-nica-v0.1.1...artesa-nica-v0.1.2) (2026-06-27)


### Bug Fixes

* **auth:** align pb_auth cookie format with PocketBase SDK 0.27 ([34c7d91](https://github.com/fabrifj07/Artesa_Nica/commit/34c7d9114933aff8cc05594389527444c6ef1704))
* **auth:** make login form client-only, remove server-side POST fallback ([5849971](https://github.com/fabrifj07/Artesa_Nica/commit/5849971ab077342a2058f84fa91120eda7d6a638))
* **auth:** pocketbaseFor uses server-side POCKETBASE_URL, not PUBLIC_* ([43d4730](https://github.com/fabrifj07/Artesa_Nica/commit/43d47301cc4bb6883b5842faa17f1d02aea06bff))
* **auth:** tighten LoginContent script types and align en routes to AuthLayout ([330d65d](https://github.com/fabrifj07/Artesa_Nica/commit/330d65deaf8f8c98485b080e99913959dcbc7038))
* **login:** server-side fallback para POST + script defensivo ([a20be6a](https://github.com/fabrifj07/Artesa_Nica/commit/a20be6aedd78c0cb585d85d42dfbbd48010907db))

## [0.1.1](https://github.com/fabrifj07/Artesa_Nica/compare/artesa-nica-v0.1.0...artesa-nica-v0.1.1) (2026-06-27)


### Features

* **artesa-nica:** astro 7 + pocketbase adoption ([9278c1e](https://github.com/fabrifj07/Artesa_Nica/commit/9278c1e8c3f946b8d23e18ad8fb430f5cf8d16ec))
* **auth:** apply enter animations to panel, form and banners ([28cf2dc](https://github.com/fabrifj07/Artesa_Nica/commit/28cf2dc089bbf8d6ba420b03978ae9d4922b7cc0))
* **auth:** CSS keyframes replicating NicaExplora entry animation ([a0d6010](https://github.com/fabrifj07/Artesa_Nica/commit/a0d601047c216f0d839070b584440c9612d6f379))
* **auth:** forgot-password + reset-password pages ([2413c9d](https://github.com/fabrifj07/Artesa_Nica/commit/2413c9d0de66a4568e79de3ed82bd0e938e5cc54))
* **auth:** forgot/reset/verify/change-password endpoints ([679a2fe](https://github.com/fabrifj07/Artesa_Nica/commit/679a2fe4c57e44ecd50ac31a3ddf5380e67ebd1c))
* **auth:** full-bleed image panel with green filter overlay ([1eeca53](https://github.com/fabrifj07/Artesa_Nica/commit/1eeca535774868dbff7fb2ed67ae57223d84b424))
* **auth:** harden login/register/logout/me endpoints ([aa4196c](https://github.com/fabrifj07/Artesa_Nica/commit/aa4196c26b14bc385945e605641eab638540bcc1))
* **auth:** middleware + per-request PB + cookie/csrf/refresh/guards helpers ([3f108b5](https://github.com/fabrifj07/Artesa_Nica/commit/3f108b57a5f4881ce16c1f23d40d563d96b1607b))
* **auth:** NicaExplora-inspired login layout ([76dc5ee](https://github.com/fabrifj07/Artesa_Nica/commit/76dc5ee1c3b5d1f4f1536ee75dccbd1c5e27696a))
* **auth:** NicaExplora-inspired register layout ([9567df0](https://github.com/fabrifj07/Artesa_Nica/commit/9567df0b7adc7f5ff97c294b9a552e58ea8df0fe))
* **auth:** PB rate-limit migration + auth-refresh audit hook ([e386d1f](https://github.com/fabrifj07/Artesa_Nica/commit/e386d1ff9e6582c06965c630da2f9605d92f5627))
* **auth:** redesign login page with split layout ([70d0385](https://github.com/fabrifj07/Artesa_Nica/commit/70d0385dce247bb965f691f53b7210383b696dbc))
* **auth:** redesign register page with split layout ([3b14212](https://github.com/fabrifj07/Artesa_Nica/commit/3b14212c5944c463e7c084cf3ecbb2b360ee3752))
* **auth:** shared AuthPanel visual component ([d51b124](https://github.com/fabrifj07/Artesa_Nica/commit/d51b124e0c702f4ead497a58438b708fcad1bf88))
* **auth:** SSR guards on /perfil, /carrito, /login, /registro ([69f451e](https://github.com/fabrifj07/Artesa_Nica/commit/69f451e9aa84197f8e0ce48624669e8befdc060d))
* **auth:** subtle blur on AuthPanel background image + saturated overlay ([ce08032](https://github.com/fabrifj07/Artesa_Nica/commit/ce08032f4a5c84aebba579bd7c67f155ab1c5975))
* **auth:** switch login and registro to AuthLayout ([baf6a50](https://github.com/fabrifj07/Artesa_Nica/commit/baf6a50024ef44b74196bf65498eab9b07392da3))
* **header:** active link state + rolling animation for mobile nav ([db8b3b1](https://github.com/fabrifj07/Artesa_Nica/commit/db8b3b1e90a37372937ef1f501422fb21d67d6bc))
* **header:** add mobile bottom nav with raised home circle ([a4d5210](https://github.com/fabrifj07/Artesa_Nica/commit/a4d5210957661343077915f0956e6aebc7f7c191))
* **home:** rediseñar hero section con blobs decorativos y mejor espaciado ([197b2d5](https://github.com/fabrifj07/Artesa_Nica/commit/197b2d590ad6ccd539f8ba61104814f1e8b8d92e))
* **i18n:** add en/es bilingual support with Astro i18n ([6cad284](https://github.com/fabrifj07/Artesa_Nica/commit/6cad284b71e6c880627cf59259cb6d542453c4df))
* **i18n:** agregar páginas forgot/reset password para locale en ([4af679e](https://github.com/fabrifj07/Artesa_Nica/commit/4af679e713ea582f53153bd8e5f2a6ced471d863))
* **i18n:** auth.forgotPassword, reset, verify, change-password keys ([90f1b50](https://github.com/fabrifj07/Artesa_Nica/commit/90f1b50c015eab2650d2fe92fa1ab0196960b6c1))
* **icons:** migrate FontAwesome CDN to astro-icon + Lucide ([77d42c8](https://github.com/fabrifj07/Artesa_Nica/commit/77d42c80e9f8495e4c34a12a96e9d0b0d4ecabfe))
* **layout:** AuthLayout without global header/footer ([7057092](https://github.com/fabrifj07/Artesa_Nica/commit/7057092b7a01329135283a9003c3ddfbe129fa7c))
* **security:** CSP, HSTS, X-Frame-Options, Permissions-Policy headers ([d48ff94](https://github.com/fabrifj07/Artesa_Nica/commit/d48ff944361a7bae24a4dec6e8a6ac7a03f6dca8))
* **styles:** añadir scrollbar personalizado con colores de marca ([706b0cd](https://github.com/fabrifj07/Artesa_Nica/commit/706b0cda58ff34d0784ada8f7908b4b4d255809a))
* **tailwind:** migrate to Tailwind CSS v4 with [@theme](https://github.com/theme) design tokens ([c82ba35](https://github.com/fabrifj07/Artesa_Nica/commit/c82ba352bebfd6786b1e2b8d5ed814917f841c05))
* **theme:** implementar dark mode con View Transition API reveal y FOUC prevention ([551872d](https://github.com/fabrifj07/Artesa_Nica/commit/551872d698744d4ea8e1a76c28dc9f44a9b3808d))


### Bug Fixes

* **auth:** drop HttpOnly from csrf-token cookie ([318a28d](https://github.com/fabrifj07/Artesa_Nica/commit/318a28d7aa9e23c0615d828c927b72a1b86274da))
* **auth:** emailVerified i18n keys, login verify banner, cookie rewrite on refresh ([14b1500](https://github.com/fabrifj07/Artesa_Nica/commit/14b1500f6069fdb711171079f48d54bd08d0606b))
* **auth:** hacer route guards i18n-aware para prefijo en/es ([264cc51](https://github.com/fabrifj07/Artesa_Nica/commit/264cc516b2021e638ff05260774889c5ade0332a))
* **auth:** include request origin in CSRF allowlist + send x-csrf-token from store ([604f6ef](https://github.com/fabrifj07/Artesa_Nica/commit/604f6efda7b008538eacb8d6ec9b2f05cc1000af))
* **auth:** set default role on register endpoint ([ae7d4f9](https://github.com/fabrifj07/Artesa_Nica/commit/ae7d4f960f2c8bbd55ef37dde91d76850e0d533d))
* **header:** enlarge navbar brand, icons, and labels ([0ddf737](https://github.com/fabrifj07/Artesa_Nica/commit/0ddf73716ac644029ee0aacb521f7d0034bb205f))
* **header:** hide duplicate active icon + tame curve-out tabs ([226a387](https://github.com/fabrifj07/Artesa_Nica/commit/226a387457de278f57336183ae90d0c4224fb2c6))
* **header:** increase gap between nav items from gap-6 to gap-10 ([d488d84](https://github.com/fabrifj07/Artesa_Nica/commit/d488d84ed0f3e85df211f248e82957a9fad0e83f))
* **header:** persist Header across view transitions to avoid nav duplicate ([91fae78](https://github.com/fabrifj07/Artesa_Nica/commit/91fae789e69dc009f8440ce89256ebacd581208c))
* **header:** remove curve-out ::before/::after tabs ([5788758](https://github.com/fabrifj07/Artesa_Nica/commit/578875845ccbc75fee43ae31eb8153a69c4aa8cf))
* **header:** rewrite mobile nav CSS to match Magic Navigation design ([4b83357](https://github.com/fabrifj07/Artesa_Nica/commit/4b83357ac9878bedafded04cb801be1e2b57cc09))
* **tailwind:** restore visual fidelity to legacy design ([3b538cb](https://github.com/fabrifj07/Artesa_Nica/commit/3b538cbf78f126386a08478c5bfa827e680ca329))
* Update total purchases calculation to show correct amount from user's purchase history ([dd800b2](https://github.com/fabrifj07/Artesa_Nica/commit/dd800b2e0c8bbf6ba0fff03f682133bd69c95151))
