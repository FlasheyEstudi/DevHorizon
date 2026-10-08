#!/usr/bin/env bash
# =============================================================================
# ArtesaNica — Script de inicio automático
# Compatible con Linux y macOS.
# Detecta e instala dependencias (pnpm o npm) si no existen.
# Inicia PocketBase (si está disponible) y el servidor Astro abriendo el navegador.
# =============================================================================

# Desactivar variables que hacen que Astro 7 se ejecute como demonio en segundo plano
unset ANTIGRAVITY_AGENT ANTIGRAVITY_PROJECT_ID ASTRO_DEV_BACKGROUND

# Asegurar que herramientas de usuario estándar estén en el PATH
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Si se ejecuta haciendo doble clic en entorno gráfico sin terminal abierta,
# relanzar dentro de un emulador de terminal disponible para ver registros.
if [ ! -t 0 ] && [ -z "$INSIDE_TERMINAL" ]; then
    export INSIDE_TERMINAL=1
    for term in konsole alacritty xfce4-terminal gnome-terminal xterm kitty foot; do
        if command -v "$term" >/dev/null 2>&1; then
            if [ "$term" = "konsole" ] || [ "$term" = "alacritty" ]; then
                exec "$term" --hold -e bash "$0" "$@"
            else
                exec "$term" -e bash "$0" "$@"
            fi
        fi
    done
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "======================================================"
echo "          INICIANDO ENTORNO ARTESANICA                "
echo "======================================================"

# Limpiar bloqueos residuales de Astro dev si quedaron procesos huérfanos
if [ -f ".astro/dev.json" ]; then
    OLD_PID=$(grep -o '"pid": *[0-9]*' .astro/dev.json 2>/dev/null | awk '{print $2}' || true)
    if [ -n "$OLD_PID" ]; then
        if ! kill -0 "$OLD_PID" 2>/dev/null; then
            rm -f .astro/dev.json
        fi
    else
        rm -f .astro/dev.json
    fi
fi

# 1. Crear .env a partir de .env.example si no existe
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "[*] Archivo .env no encontrado. Creando a partir de .env.example..."
    cp .env.example .env
fi

# 2. Detectar gestor de paquetes (pnpm o npm)
PKG_MANAGER=""
if command -v pnpm >/dev/null 2>&1; then
    PKG_MANAGER="pnpm"
elif command -v npm >/dev/null 2>&1; then
    PKG_MANAGER="npm"
else
    echo "Error: No se encontró 'pnpm' ni 'npm' en el sistema."
    echo "Por favor instale Node.js (v22 o superior) desde https://nodejs.org/"
    read -r -p "Presione Enter para salir..."
    exit 1
fi

echo "[*] Gestor de paquetes detectado: $PKG_MANAGER"

# 3. Instalar dependencias automáticamente si node_modules no existe
if [ ! -d "node_modules" ]; then
    echo ""
    echo "======================================================"
    echo "  No se encontró la carpeta 'node_modules'."
    echo "  Descargando e instalando dependencias con $PKG_MANAGER..."
    echo "======================================================"
    echo ""
    $PKG_MANAGER install
    echo ""
    echo "  Dependencias instaladas con éxito."
    echo ""
fi

STARTED_PB=0

cleanup() {
    local exit_status=$?
    echo ""
    echo "======================================================"
    echo "  Deteniendo servicios de ArtesaNica..."
    echo "======================================================"
    if [ "$STARTED_PB" -eq 1 ]; then
        if [ -x "$PROJECT_DIR/pb/start.sh" ]; then
            "$PROJECT_DIR/pb/start.sh" stop 2>/dev/null || true
        fi
    fi
    rm -f "$PROJECT_DIR/.astro/dev.json" 2>/dev/null || true
    echo "  Servicios detenidos correctamente."
    
    if [ -n "$INSIDE_TERMINAL" ] || [ $exit_status -ne 0 ]; then
        echo ""
        read -r -p "Presione Enter para cerrar la terminal..."
    fi
    exit "$exit_status"
}

trap cleanup EXIT INT TERM

# 4. Iniciar PocketBase local si el binario existe
if [ -x "$PROJECT_DIR/pb/start.sh" ] && [ -x "$PROJECT_DIR/pb/pocketbase" ]; then
    echo "[1/2] Verificando PocketBase local..."
    if ! "$PROJECT_DIR/pb/start.sh" status >/dev/null 2>&1; then
        echo "      Levantando PocketBase en segundo plano..."
        "$PROJECT_DIR/pb/start.sh" start
        STARTED_PB=1
    else
        echo "      PocketBase ya está en ejecución (http://127.0.0.1:8090)"
    fi
else
    echo "[1/2] PocketBase local no configurado; usando backend en la nube (.env)"
fi

# 5. Iniciar servidor de desarrollo Astro y abrir el navegador
echo ""
echo "[2/2] Iniciando Astro (Frontend)..."
echo "      - Web:              http://localhost:4321"
if [ -x "$PROJECT_DIR/pb/pocketbase" ]; then
    echo "      - Admin PocketBase: http://127.0.0.1:8090/_/"
fi
echo ""
echo "Presione [Ctrl + C] para detener el servidor y los servicios."
echo "======================================================"
echo ""

if [ "$PKG_MANAGER" = "pnpm" ]; then
    pnpm dev --open
else
    npm run dev -- --open
fi
