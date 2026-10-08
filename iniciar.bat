@echo off
chcp 65001 > nul
title ArtesaNica - Servidor Local

echo ======================================================
echo           INICIANDO ENTORNO ARTESANICA                
echo ======================================================
echo.

cd /d "%~dp0"

:: 1. Crear .env desde .env.example si no existe
if not exist ".env" (
    if exist ".env.example" (
        echo [*] Creando archivo de configuracion .env desde .env.example...
        copy .env.example .env > nul
    )
)

:: 2. Detectar pnpm o npm
set PKG_MANAGER=
where pnpm >nul 2>nul
if %errorlevel% equ 0 (
    set PKG_MANAGER=pnpm
) else (
    where npm >nul 2>nul
    if %errorlevel% equ 0 (
        set PKG_MANAGER=npm
    ) else (
        echo Error: No se encontro Node.js ni npm/pnpm instalado en su sistema.
        echo Por favor instale Node.js (version 22 o superior) desde https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
)

echo [*] Gestor de paquetes detectado: %PKG_MANAGER%

:: 3. Instalar dependencias automaticamente si no existe node_modules
if not exist "node_modules\" (
    echo.
    echo ======================================================
    echo   No se encontro la carpeta 'node_modules'.
    echo   Instalando dependencias automaticamente con %PKG_MANAGER%...
    echo ======================================================
    echo.
    if "%PKG_MANAGER%"=="pnpm" (
        call pnpm install
    ) else (
        call npm install
    )
    if %errorlevel% neq 0 (
        echo.
        echo Error durante la instalacion de dependencias.
        pause
        exit /b %errorlevel%
    )
    echo Dependencias instaladas con exito.
    echo.
)

:: 4. Iniciar PocketBase si existe pocketbase.exe en pb\
if exist "pb\pocketbase.exe" (
    echo [*] Iniciando PocketBase local para Windows...
    start "" /b pb\pocketbase.exe serve
) else (
    echo [*] Usando backend remoto configurado en .env (PocketHost Cloud)
)

:: 5. Iniciar servidor de desarrollo Astro
echo.
echo ======================================================
echo   Iniciando Astro Frontend...
echo   - Web: http://localhost:4321
echo.
echo   Presione Ctrl + C para detener el servidor.
echo ======================================================
echo.

if "%PKG_MANAGER%"=="pnpm" (
    call pnpm dev -- --open
) else (
    call npm run dev -- --open
)

pause
