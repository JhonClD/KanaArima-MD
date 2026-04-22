#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Script de instalación de optimizaciones para KanaArima-MD
# ═══════════════════════════════════════════════════════════════

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Optimizaciones KanaArima-MD - Instalador${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: No se encontró package.json${NC}"
    echo -e "${RED}Por favor ejecuta este script desde el directorio raíz de KanaArima-MD${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Directorio correcto detectado${NC}"
echo ""

# Backup
echo -e "${YELLOW}[1/6] Creando backup...${NC}"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp package.json "$BACKUP_DIR/" 2>/dev/null || true
cp main.js "$BACKUP_DIR/" 2>/dev/null || true
cp handler.js "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Backup creado en: $BACKUP_DIR${NC}"
echo ""

# Actualizar package.json
echo -e "${YELLOW}[2/6] Actualizando package.json...${NC}"
if [ -f "package.json.new" ]; then
    cp package.json.new package.json
    echo -e "${GREEN}✓ package.json actualizado${NC}"
else
    echo -e "${YELLOW}⚠ package.json.new no encontrado, omitiendo...${NC}"
fi
echo ""

# Crear directorios necesarios
echo -e "${YELLOW}[3/6] Creando estructura de directorios...${NC}"
mkdir -p src/libraries
echo -e "${GREEN}✓ Directorios creados${NC}"
echo ""

# Copiar archivos nuevos
echo -e "${YELLOW}[4/6] Copiando archivos optimizados...${NC}"

if [ -f "src/libraries/pluginLoader.js.new" ]; then
    cp src/libraries/pluginLoader.js.new src/libraries/pluginLoader.js
    echo -e "${GREEN}✓ pluginLoader.js instalado${NC}"
fi

if [ -f "src/libraries/handlerOptimizations.js.new" ]; then
    cp src/libraries/handlerOptimizations.js.new src/libraries/handlerOptimizations.js
    echo -e "${GREEN}✓ handlerOptimizations.js instalado${NC}"
fi
echo ""

# Instalar dependencias
echo -e "${YELLOW}[5/6] Instalando dependencias actualizadas...${NC}"
echo -e "${BLUE}Esto puede tardar unos minutos...${NC}"
npm install 2>&1 | grep -v "^npm WARN" || true
echo -e "${GREEN}✓ Dependencias instaladas${NC}"
echo ""

# Instrucciones manuales
echo -e "${YELLOW}[6/6] Pasos manuales requeridos:${NC}"
echo ""
echo -e "${BLUE}main.js:${NC}"
echo "  • Líneas 1064-1111: Aplicar main.js.patch"
echo "  • Línea 539: Aplicar baileys-connection-optimizations.js"
echo ""
echo -e "${BLUE}handler.js:${NC}"
echo "  • Líneas 1-20: Agregar imports de handler-cache-patch.js"
echo "  • Líneas 104-708: Aplicar sección optimizada de handler-cache-patch.js"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}Instalación completada!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Próximos pasos:${NC}"
echo "  1. Revisa el archivo README.md para instrucciones detalladas"
echo "  2. Aplica los parches manuales en main.js y handler.js"
echo "  3. Ejecuta: npm start"
echo ""
echo -e "${YELLOW}Tu backup está en: $BACKUP_DIR${NC}"
echo -e "${YELLOW}Si algo sale mal, puedes restaurar desde ahí${NC}"
echo ""
