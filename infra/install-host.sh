#!/usr/bin/env bash
# =============================================================================
# ArtesaNica — instalación del host (CachyOS / Arch Linux)
# =============================================================================
# Instala nginx + Docker, copia la configuración del proxy inverso y activa los
# servicios. Es el ÚNICO paso que necesita privilegios de root.
#
#   sudo bash infra/install-host.sh
#
# Después:
#   cp .env.docker.example .env.docker   &&   editar credenciales
#   bash infra/up.sh                      # levanta los contenedores
#   bash infra/verify.sh                  # comprueba el despliegue
#
# Qué hace exactamente (6 pasos):
#   1. Instala nginx, docker y docker-compose (pacman, idempotente).
#   2. Activa el daemon de Docker.
#   3. Copia nginx.conf, los snippets y el vhost a /etc/nginx/.
#   4. Valida la configuración con `nginx -t`.
#   5. Añade el usuario real al grupo `docker` (para no usar sudo con docker).
#   6. Abre 80/443 en el firewall (si hay ufw/firewalld) y arranca nginx.
# =============================================================================
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: ejecútalo con sudo:  sudo bash infra/install-host.sh" >&2
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_USER="${SUDO_USER:-${USER:-}}"

echo "=============================================================="
echo " ArtesaNica — instalación del host (proxy inverso + Docker)"
echo "=============================================================="
echo "Proyecto : $PROJECT_DIR"
echo "Usuario  : ${TARGET_USER:-desconocido}"
echo

# ---------------------------------------------------------------------------
# 1. Paquetes
# ---------------------------------------------------------------------------
echo "==> [1/6] Instalando nginx, docker y docker-compose"
pacman -S --needed --noconfirm nginx docker docker-compose

# ---------------------------------------------------------------------------
# 2. Daemon de Docker
# ---------------------------------------------------------------------------
echo "==> [2/6] Activando el daemon de Docker"
systemctl enable --now docker.service
systemctl is-active --quiet docker.service \
    && echo "    docker: activo" \
    || { echo "    ERROR: el daemon de Docker no arrancó" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 3. Configuración de nginx
# ---------------------------------------------------------------------------
echo "==> [3/6] Instalando la configuración de nginx"
install -d -m 755 /etc/nginx/snippets /etc/nginx/conf.d
install -d -m 755 /var/lib/letsencrypt

# nginx (paquete de Arch) delega `mime.types` en el paquete `mailcap`, que lo
# instala en /etc/nginx/mime.types. Red de seguridad por si faltara:
if [ ! -f /etc/nginx/mime.types ] && [ -f /etc/mime.types ]; then
    ln -sf /etc/mime.types /etc/nginx/mime.types
    echo "    creado enlace /etc/nginx/mime.types -> /etc/mime.types"
fi

if [ -f /etc/nginx/nginx.conf ] && [ ! -f /etc/nginx/nginx.conf.orig ]; then
    cp -a /etc/nginx/nginx.conf /etc/nginx/nginx.conf.orig
    echo "    copia de seguridad: /etc/nginx/nginx.conf.orig"
fi

install -m 644 "$PROJECT_DIR/infra/nginx/nginx.conf" /etc/nginx/nginx.conf
install -m 644 "$PROJECT_DIR"/infra/nginx/snippets/*.conf /etc/nginx/snippets/
install -m 644 "$PROJECT_DIR/infra/nginx/conf.d/artesanica.conf" /etc/nginx/conf.d/artesanica.conf
# La plantilla TLS queda instalada pero inactiva (extensión .example)
install -m 644 "$PROJECT_DIR/infra/nginx/conf.d/artesanica-tls.conf.example" \
    /etc/nginx/conf.d/artesanica-tls.conf.example

# ---------------------------------------------------------------------------
# 4. Validación de la configuración
# ---------------------------------------------------------------------------
echo "==> [4/6] Validando la configuración (nginx -t)"
nginx -t

# ---------------------------------------------------------------------------
# 5. Grupo docker
# ---------------------------------------------------------------------------
echo "==> [5/6] Permisos de Docker"
if [ -n "$TARGET_USER" ] && [ "$TARGET_USER" != "root" ]; then
    if id -nG "$TARGET_USER" 2>/dev/null | tr ' ' '\n' | grep -qx docker; then
        echo "    $TARGET_USER ya pertenece al grupo docker"
    else
        usermod -aG docker "$TARGET_USER"
        echo "    $TARGET_USER añadido al grupo docker"
        echo "    (aplica al reiniciar sesión; mientras tanto infra/up.sh usa 'sg docker')"
    fi
fi

# ---------------------------------------------------------------------------
# 6. Firewall y arranque de nginx
# ---------------------------------------------------------------------------
echo "==> [6/6] Firewall y arranque de nginx"
if command -v ufw >/dev/null 2>&1; then
    ufw allow 80/tcp  || true
    ufw allow 443/tcp || true
    echo "    ufw: 80/443 permitidos"
elif command -v firewall-cmd >/dev/null 2>&1; then
    firewall-cmd --permanent --add-service=http  >/dev/null || true
    firewall-cmd --permanent --add-service=https >/dev/null || true
    firewall-cmd --reload >/dev/null || true
    echo "    firewalld: http/https permitidos"
else
    echo "    sin ufw/firewalld: asegúrate de abrir 80 y 443 en tu router/firewall"
fi

systemctl enable --now nginx
systemctl reload nginx 2>/dev/null || systemctl restart nginx

echo
echo "=============================================================="
echo " Host listo. Siguientes pasos (sin sudo):"
echo "   1) cp .env.docker.example .env.docker   # y editar credenciales"
echo "   2) bash infra/up.sh"
echo "   3) bash infra/verify.sh"
echo " Recuerda: nginx devolverá 502 hasta que los contenedores estén arriba."
echo "=============================================================="
