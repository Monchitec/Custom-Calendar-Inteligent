# Regla Obligatoria de Sistema de Diseño y Tokens UI (Calendario Personal)

## 1. Prohibición estricta de colores arbitrarios
- Está **estrictamente prohibido** usar clases con colores fijos o arbitrarios de Tailwind como `bg-pink-*`, `bg-rose-*`, `bg-blue-*`, `bg-indigo-*`, `bg-purple-*`, `bg-slate-*`, `text-gray-*`, `text-white`, `text-black` o códigos hexadecimales directos (`bg-[#...]`) dentro de componentes.
- **Motivo**: el usuario puede cambiar la temática de color (por ejemplo, Rosado Armónico, Salvia, Océano, Lavanda, Atardecer, Minimalista) y alternar entre modo claro y oscuro en tiempo real. Cualquier color quemado rompe la personalización.

## 2. Uso obligatorio de Tokens Semánticos (`app/globals.css`)
Todo componente nuevo o modificado debe consumir exclusivamente los tokens globales definidos en `app/globals.css` (expuestos mediante `@theme inline` de Tailwind CSS v4):

- **Superficies y texto**:
  - Fondo general: `bg-background`
  - Paneles / Sidebar / Header: `bg-surface`
  - Tarjetas / Celdas de calendario / Modales: `bg-card` y `hover:bg-card-hover`
  - Fondos secundarios / Chips neutros: `bg-muted`
  - Texto principal: `text-foreground`
  - Texto secundario / Metadatos: `text-muted-foreground`
  - Bordes y líneas de cuadrícula: `border-border`
- **Acentos temáticos (cambian según la paleta elegida por el usuario)**:
  - Acción principal y estado activo: `bg-primary`, `hover:bg-primary-hover`, `text-primary-foreground`, `bg-primary-soft`, `ring-primary`
  - Acento complementario: `bg-secondary`, `text-secondary`, `text-secondary-foreground`
  - Acento terciario / Resaltes: `bg-accent`, `text-accent`
- **Estados semánticos**:
  - Éxito / Pagado / Completado: `bg-success`, `text-success`
  - Advertencia / Próximo a vencer: `bg-warning`, `text-warning`
  - Peligro / Vencido / Eliminar: `bg-danger`, `text-danger`
- **Categorías personalizables del calendario**:
  - Usar siempre los tokens de categoría (`--cat-bills` y los slots configurables `--cat-1` a `--cat-7` con sus variantes `*-soft`). Nunca guardar ni renderizar códigos hexadecimales directos en las categorías del usuario.

## 3. Tipografía numérica y accesibilidad táctil
- Aplicar siempre `tabular-nums` en relojes, fechas de calendario, horas de alarmas y montos de pagos recurrentes.
- Mantener áreas táctiles cómodas (`min-h-11` cuando aplique a acciones principales) y foco visible con `focus-visible:ring-2 focus-visible:ring-primary`.

## 4. Respeto a los Skills del proyecto
- Antes de construir o modificar vistas, componentes o estilos, consultar siempre:
  - `.agents/skills/ui-design-system/SKILL.md`
  - `.agents/skills/app-architecture-Generico/SKILL.md`
