# PRD — Sistema de Theme Configurable por JSON para Arquitectura Web

## 1. Resumen ejecutivo

Este documento define los requerimientos para incorporar a la arquitectura de la aplicación un sistema de **theme configurable, abstracto y desacoplado**, basado en un archivo **JSON** que centralice las decisiones visuales de la interfaz.

El objetivo es que la web pueda **mutar su diseño** sin necesidad de modificar manualmente estilos hardcodeados en componentes o layouts. Esta solución debe permitir controlar de forma consistente aspectos como colores, tipografías, spacing, márgenes, paddings, radios, sombras, breakpoints, tamaños y variantes visuales de componentes.

La propuesta busca transformar el theme en una **capa de configuración reusable**, escalable y mantenible, que funcione como fuente de verdad para branding, diseño visual y consistencia de UI.

---

## 2. Problema a resolver

Hoy, en muchas arquitecturas frontend, una gran parte del diseño queda distribuido entre:

* estilos hardcodeados en componentes
* clases repetidas
* decisiones visuales dispersas
* overrides manuales
* falta de consistencia entre pantallas
* dificultad para adaptar branding o lanzar nuevas variantes visuales

Esto genera varios problemas:

* alto costo para cambiar el look & feel
* riesgo de inconsistencias visuales
* poca reutilización entre proyectos
* fuerte acoplamiento entre diseño y código
* baja velocidad para rebranding o multi-branding
* complejidad para escalar un design system

Se necesita una solución donde el diseño no dependa de cambios manuales repetitivos, sino de una **configuración estructurada y validable**.

---

## 3. Objetivo del producto

Diseñar e implementar un sistema de **theme abstraction** basado en JSON que permita definir y consumir tokens visuales y configuraciones de componentes desde una fuente de verdad única.

### Objetivos principales

* Permitir cambiar el diseño visual de una web desde configuración.
* Desacoplar el estilo del código de implementación de componentes.
* Mejorar la consistencia visual global.
* Facilitar branding, rebranding y variantes por cliente o producto.
* Crear una base escalable para futuros themes, dark mode o multi-brand.

---

## 4. Objetivos funcionales

El sistema debe permitir:

1. **Configurar el theme mediante un archivo JSON**.
2. **Representar tokens base y tokens semánticos**.
3. **Centralizar reglas visuales globales**.
4. **Definir configuraciones específicas por componente**.
5. **Soportar variantes visuales**.
6. **Aplicar defaults y fallbacks** si faltan propiedades.
7. **Validar estructura y tipos del JSON** antes de consumirlo.
8. **Escalar a múltiples themes** sin reescribir la arquitectura.
9. **Facilitar futura integración con dark mode y white-labeling**.

---

## 5. Alcance

## Incluido en esta versión

* Definición de un archivo JSON de theme.
* Estructura abstracta y escalable del schema.
* Tokens globales:

  * colores
  * tipografía
  * spacing
  * sizing
  * border radius
  * shadows
  * borders
  * breakpoints
  * z-index
* Configuración básica de layout:

  * contenedores
  * anchos máximos
  * gutters
  * paddings generales
* Configuración de componentes base:

  * button
  * input
  * card
  * modal
  * badge
  * header
  * link
* Sistema de variantes visuales.
* Fallbacks por default.
* Validación del archivo JSON.
* Preparación para integración con CSS variables, Tailwind config o theme provider.

## Fuera de alcance en V1

* Editor visual de themes.
* Theme builder para usuarios finales.
* Personalización por usuario en runtime.
* Animaciones avanzadas configurables.
* Diseño automático generado por IA.
* Soporte completo para multi-branding extremo con inheritance complejo.
* Marketplace de themes.

---

## 6. Usuarios / stakeholders

### Stakeholders principales

* **Frontend developers**: implementarán el consumo del theme.
* **Product designers**: definirán reglas visuales y consistencia.
* **Product managers**: priorizarán alcance y evolución.
* **Arquitectos de software**: asegurarán integración y escalabilidad.
* **QA**: validarán consistencia y fallback behavior.

---

## 7. Requerimientos funcionales

## RF-01 — Fuente de verdad centralizada

El sistema debe tener un archivo JSON como fuente primaria de configuración visual.

## RF-02 — Carga del theme

La aplicación debe poder cargar el theme desde una ubicación definida por arquitectura:

* archivo local
* configuración del proyecto
* endpoint remoto en futuras versiones

## RF-03 — Validación estructural

El JSON debe validarse contra un schema tipado antes de ser aplicado.

## RF-04 — Tokens base

El theme debe contemplar tokens base reutilizables:

* primitive colors
* font families
* font sizes
* spacing scale
* radius scale
* shadow scale
* border widths
* sizing scale

## RF-05 — Tokens semánticos

El sistema debe soportar tokens semánticos como:

* primary
* secondary
* success
* warning
* danger
* background
* surface
* textPrimary
* textSecondary
* borderDefault
* focus
* disabled

## RF-06 — Configuración de layout

Debe poder configurarse:

* ancho máximo de layout
* spacing horizontal general
* padding de secciones
* separación vertical entre bloques
* grid/container behavior

## RF-07 — Configuración por componente

Cada componente base debe poder tener configuración específica, por ejemplo:

* tamaño
* variant
* radius
* padding
* font
* border
* background
* hover
* active
* disabled

## RF-08 — Variantes

Los componentes deben soportar variantes como:

* primary
* secondary
* ghost
* outline
* danger
* success

## RF-09 — Estados

Deben contemplarse estados visuales:

* default
* hover
* focus
* active
* disabled
* error

## RF-10 — Fallbacks

Si una propiedad no está definida:

* debe tomarse un valor global por default
* si no existe, debe tomarse un fallback del sistema
* si el valor es obligatorio y no existe, debe fallar validación

## RF-11 — Versionado

El JSON debe incluir metadatos de versión para facilitar evolución del schema.

## RF-12 — Extensibilidad

La estructura debe permitir agregar nuevas categorías o componentes sin romper compatibilidad hacia atrás.

## RF-13 — Integración con componentes

Los componentes deben consumir el theme a través de una capa centralizada, no leyendo directamente el JSON de forma dispersa.

## RF-14 — Separación entre base y semantic tokens

La arquitectura debe distinguir claramente entre:

* tokens primitivos
* tokens semánticos
* configuración de componentes

## RF-15 — Soporte futuro para múltiples themes

Aunque V1 no implemente switching dinámico completo, el diseño debe quedar preparado para soportarlo.

---

## 8. Requerimientos no funcionales

## RNF-01 — Escalabilidad

La solución debe soportar crecimiento en cantidad de tokens, componentes y variantes.

## RNF-02 — Mantenibilidad

Los cambios visuales deben realizarse en configuración y no en múltiples archivos de componentes.

## RNF-03 — Performance

La resolución del theme no debe afectar perceptiblemente el tiempo de render inicial.

## RNF-04 — Tipado fuerte

Debe existir validación y tipado consistente del schema.

## RNF-05 — Observabilidad

Debe ser fácil detectar errores en themes inválidos o incompletos.

## RNF-06 — Compatibilidad

Debe poder integrarse con stacks modernos como:

* Next.js
* React
* Tailwind
* CSS variables
* Design systems internos
* shadcn/ui o librerías similares

## RNF-07 — Backward compatibility

El schema debe evolucionar sin romper themes previos de forma innecesaria.

## RNF-08 — Legibilidad

La estructura JSON debe ser entendible y ordenada para diseño y desarrollo.

---

## 9. Principios de diseño de la solución

1. **Configuración antes que hardcodeo**
2. **Tokens antes que valores repetidos**
3. **Semántica antes que color directo en componentes**
4. **Fallbacks consistentes**
5. **Consumo centralizado**
6. **Preparado para escalar**
7. **Agnóstico al framework visual cuando sea posible**

---

## 10. Propuesta de estructura del JSON

```json
{
  "metadata": {
    "themeName": "default-theme",
    "version": "1.0.0",
    "mode": "light"
  },
  "foundations": {
    "colors": {
      "primitive": {
        "white": "#FFFFFF",
        "black": "#000000",
        "blue500": "#2563EB",
        "gray100": "#F3F4F6",
        "gray500": "#6B7280",
        "gray900": "#111827",
        "red500": "#EF4444",
        "green500": "#22C55E"
      },
      "semantic": {
        "background": "{colors.primitive.white}",
        "surface": "{colors.primitive.gray100}",
        "textPrimary": "{colors.primitive.gray900}",
        "textSecondary": "{colors.primitive.gray500}",
        "primary": "{colors.primitive.blue500}",
        "danger": "{colors.primitive.red500}",
        "success": "{colors.primitive.green500}",
        "borderDefault": "{colors.primitive.gray100}"
      }
    },
    "typography": {
      "fontFamily": {
        "base": "Inter, sans-serif",
        "heading": "Inter, sans-serif",
        "mono": "ui-monospace, monospace"
      },
      "fontSize": {
        "xs": "12px",
        "sm": "14px",
        "md": "16px",
        "lg": "18px",
        "xl": "20px",
        "2xl": "24px"
      },
      "fontWeight": {
        "regular": 400,
        "medium": 500,
        "semibold": 600,
        "bold": 700
      },
      "lineHeight": {
        "tight": 1.2,
        "normal": 1.5,
        "relaxed": 1.7
      }
    },
    "spacing": {
      "0": "0px",
      "1": "4px",
      "2": "8px",
      "3": "12px",
      "4": "16px",
      "5": "20px",
      "6": "24px",
      "8": "32px",
      "10": "40px",
      "12": "48px"
    },
    "sizing": {
      "xs": "24px",
      "sm": "32px",
      "md": "40px",
      "lg": "48px",
      "xl": "56px"
    },
    "radius": {
      "none": "0px",
      "sm": "4px",
      "md": "8px",
      "lg": "12px",
      "xl": "16px",
      "full": "9999px"
    },
    "shadows": {
      "sm": "0 1px 2px rgba(0,0,0,0.08)",
      "md": "0 4px 12px rgba(0,0,0,0.12)",
      "lg": "0 10px 24px rgba(0,0,0,0.16)"
    },
    "borders": {
      "thin": "1px",
      "thick": "2px"
    },
    "breakpoints": {
      "sm": "640px",
      "md": "768px",
      "lg": "1024px",
      "xl": "1280px",
      "2xl": "1536px"
    },
    "zIndex": {
      "base": 1,
      "dropdown": 1000,
      "sticky": 1100,
      "modal": 1300,
      "toast": 1400
    }
  },
  "layout": {
    "container": {
      "maxWidth": "1280px",
      "paddingX": "{spacing.4}",
      "paddingXMobile": "{spacing.3}",
      "sectionGap": "{spacing.8}"
    },
    "grid": {
      "columns": 12,
      "gutter": "{spacing.4}"
    }
  },
  "components": {
    "button": {
      "base": {
        "fontFamily": "{typography.fontFamily.base}",
        "fontWeight": "{typography.fontWeight.semibold}",
        "borderRadius": "{radius.md}",
        "height": "{sizing.md}",
        "paddingX": "{spacing.4}",
        "shadow": "{shadows.sm}"
      },
      "variants": {
        "primary": {
          "background": "{colors.semantic.primary}",
          "textColor": "{colors.primitive.white}",
          "borderColor": "{colors.semantic.primary}"
        },
        "secondary": {
          "background": "{colors.semantic.surface}",
          "textColor": "{colors.semantic.textPrimary}",
          "borderColor": "{colors.semantic.borderDefault}"
        },
        "outline": {
          "background": "transparent",
          "textColor": "{colors.semantic.primary}",
          "borderColor": "{colors.semantic.primary}"
        }
      },
      "states": {
        "hoverOpacity": 0.92,
        "disabledOpacity": 0.5
      }
    },
    "input": {
      "base": {
        "height": "{sizing.md}",
        "paddingX": "{spacing.3}",
        "borderRadius": "{radius.md}",
        "background": "{colors.primitive.white}",
        "borderColor": "{colors.semantic.borderDefault}",
        "textColor": "{colors.semantic.textPrimary}"
      },
      "states": {
        "focusBorderColor": "{colors.semantic.primary}",
        "errorBorderColor": "{colors.semantic.danger}"
      }
    },
    "card": {
      "base": {
        "background": "{colors.semantic.surface}",
        "borderRadius": "{radius.lg}",
        "padding": "{spacing.5}",
        "shadow": "{shadows.md}"
      }
    },
    "modal": {
      "base": {
        "background": "{colors.primitive.white}",
        "borderRadius": "{radius.lg}",
        "shadow": "{shadows.lg}",
        "maxWidth": "720px",
        "padding": "{spacing.6}"
      }
    }
  }
}
```

---

## 11. Explicación de la estructura

### metadata

Contiene identidad y control de versión del theme.

### foundations

Contiene las decisiones fundamentales del sistema visual.

#### primitive tokens

Valores base directos, por ejemplo hexadecimales o tamaños concretos.

#### semantic tokens

Valores con intención de uso, por ejemplo `primary`, `background`, `textPrimary`.

### layout

Reglas globales de estructura de página.

### components

Configuración específica por componente.

---

## 12. Arquitectura conceptual

La arquitectura recomendada debería seguir este flujo:

```text
theme.json
   ↓
Theme Schema Validator
   ↓
Theme Parser / Resolver
   ↓
Token Resolver (primitive + semantic + fallback)
   ↓
Theme Provider / CSS Variables / Tailwind Mapping
   ↓
Component Library Consumption
   ↓
UI Render
```

### Componentes de esta arquitectura

#### 1. Theme JSON

Archivo de configuración fuente.

#### 2. Validator

Valida forma, tipos, campos obligatorios y compatibilidad de versión.

#### 3. Parser / Resolver

Resuelve referencias internas como:
`{colors.primitive.blue500}`

#### 4. Token engine

Convierte configuración en valores listos para usar.

#### 5. Theme provider

Expone el theme al resto de la aplicación.

#### 6. UI components

Consumen tokens ya resueltos, no lógica cruda del JSON.

---

## 13. Casos de uso

## Caso 1 — Rebranding rápido

Una empresa necesita pasar de una identidad azul a una verde.
Con este sistema, se modifica el JSON y el cambio impacta de forma centralizada.

## Caso 2 — Crear una variante premium

Se puede definir otro theme con:

* tipografías distintas
* sombras más marcadas
* mayor radius
* layout más espacioso

## Caso 3 — Ajuste global de spacing

Si el equipo detecta que la UI está muy comprimida, puede aumentar la escala de spacing sin tocar decenas de componentes.

## Caso 4 — White-label por cliente

Dos clientes pueden compartir producto y lógica, pero usar distinta identidad visual.

## Caso 5 — Dark mode futuro

La estructura semántica permite que `background`, `surface`, `textPrimary` apunten a otros primitives según el modo.

---

## 14. Riesgos y consideraciones

## Riesgo 1 — Exceso de flexibilidad

Si el JSON permite demasiados overrides, se puede volver difícil de mantener.

**Mitigación:**
Definir una jerarquía clara:

* global
* semantic
* component
* variant

## Riesgo 2 — Inconsistencias de schema

Cambios sin validación pueden romper rendering.

**Mitigación:**
Schema validation estricta y versionado.

## Riesgo 3 — Complejidad de referencias

El uso de aliases o referencias puede dificultar debugging.

**Mitigación:**
Resolver tokens previo al render y generar logs claros.

## Riesgo 4 — Legacy components

Algunos componentes existentes pueden tener estilos acoplados.

**Mitigación:**
Migración progresiva por capas.

## Riesgo 5 — Falsa abstracción

Si el sistema solo mueve valores a JSON sin diseñar bien los tokens, el problema sigue existiendo.

**Mitigación:**
Separar foundations, semantics y component config.

---

## 15. Dependencias técnicas sugeridas

* **Zod** o **JSON Schema** para validación
* **TypeScript types** derivados del schema
* **Theme parser/resolver**
* **CSS variables** o **Tailwind theme mapping**
* **Theme provider** en React
* **Design system / component library**
* tooling opcional para:

  * linting de tokens
  * documentación automática
  * snapshot visual testing

---

## 16. Criterios de aceptación

1. Existe un archivo JSON único de theme con estructura documentada.
2. El JSON puede validar correctamente contra un schema.
3. La aplicación puede consumir tokens globales desde ese archivo.
4. Los componentes base definidos en alcance usan la configuración centralizada.
5. Los cambios en colores, spacing y typography impactan sin tocar directamente los componentes.
6. Existen fallbacks claros si faltan valores no críticos.
7. Los errores de configuración crítica son detectables y trazables.
8. La solución diferencia tokens primitivos, semánticos y configuraciones de componente.
9. La arquitectura queda preparada para soportar más de un theme.
10. El sistema reduce la necesidad de editar clases o estilos repetitivos en múltiples archivos.

---

## 17. Métricas de éxito

### Métricas operativas

* Reducción del tiempo de cambio de branding.
* Reducción de archivos tocados para cambios visuales globales.
* Reducción de inconsistencias visuales detectadas en QA.

### Métricas técnicas

* Porcentaje de componentes base consumiendo tokens configurables.
* Porcentaje de estilos hardcodeados eliminados.
* Tiempo medio de implementación de una nueva variante visual.

### Métricas de producto/diseño

* Velocidad para lanzar una nueva identidad visual.
* Capacidad de mantener consistencia entre nuevas pantallas.

---

## 18. Fases de implementación sugeridas

## Fase 1 — Foundations

* Definir schema del JSON
* Implementar validator
* Crear primitive + semantic tokens
* Integrar colores, typography, spacing, radius, shadows

## Fase 2 — Layout

* Integrar container, paddings, márgenes y breakpoints
* Resolver tokens en layout global

## Fase 3 — Componentes base

* Migrar button, input, card, modal
* Agregar variants y states

## Fase 4 — Hardening

* Fallbacks
* logs
* documentación
* testing visual

## Fase 5 — Evolución

* soporte de múltiples themes
* dark mode
* theme switching
* white-labeling más avanzado

---

## 19. Open questions

1. ¿El theme será estático por build o podrá cambiar en runtime?
2. ¿Se necesita soportar multi-tenant con branding por cliente?
3. ¿Se integrará con Tailwind, CSS variables, o ambos?
4. ¿Qué nivel de override por componente se permitirá en V1?
5. ¿Qué componentes entran realmente en la primera migración?
6. ¿Habrá modo dark desde el inicio o se deja preparado?
7. ¿El JSON será mantenido por developers únicamente o también por diseño?
8. ¿Se requiere documentación automática del theme?
9. ¿Se necesita compatibilidad con una librería de UI existente?
10. ¿Cómo se manejará el versionado y migración de schemas futuros?

---

## 20. Recomendación técnica final

La mejor dirección para esta solución es tratar el theme como una **capa de configuración estructural del sistema visual**, no como un simple archivo de colores. La arquitectura debe apoyarse en:

* tokens primitivos
* tokens semánticos
* configuración de layout
* configuración de componentes
* parser + validator
* capa de consumo centralizada

Eso permitirá una base real para escalar el diseño de la web de forma limpia, reusable y mantenible.

---

## 21. Verificación final

Este PRD contempla:

* abstracción real del theme
* JSON como fuente de verdad
* separación entre tokens base y semánticos
* reglas de layout y componentes
* extensibilidad
* validación
* fallbacks
* criterios de aceptación
* evolución futura hacia multi-theme y dark mode

---
