# REGLAS Y ESTÁNDARES DEL PROYECTO: SISTEMA DE ENCUESTAS DE SATISFACCIÓN (v1.3)

## 1. Propósito
Este documento establece las reglas, estándares y convenciones a seguir durante el desarrollo del Sistema de Encuestas de Satisfacción. Su objetivo es asegurar la consistencia, calidad, mantenibilidad y escalabilidad del código y la arquitectura. **Todo el equipo de desarrollo debe adherirse a estas directrices.**

## 2. Pila Tecnológica (Stack)
*   **Base de Datos:** PostgreSQL (gestionado por Supabase).
*   **Backend (BaaS):** Supabase (Auth, Database, Storage, Edge Functions, APIs Instantáneas).
*   **Lenguaje Backend (Edge Functions):** TypeScript (sobre Deno).
*   **Frontend:** React (con Vite).
*   **Routing:** `react-router-dom`.
*   **Gestión de Estado:** Estado local y React Context API (evaluar Zustand si crece la complejidad).
*   **UI:** Tailwind CSS. **Utilizar componentes de Shadcn UI / Radix UI** para bloques de construcción UI accesibles y estilados con Tailwind.
*   **Validación de Formularios:** **Zod** (preferiblemente con `react-hook-form`).
*   **Utilidades Hooks:** `react-use` (opcional) o hooks personalizados.
*   **Gestor de Paquetes:** `pnpm` (preferido), `npm` o `yarn`.
*   **Cliente Supabase:** `supabase-js`.

## 3. Arquitectura General
*   **Filosofía "Código Primero":** La lógica de negocio principal residirá en las **Supabase Edge Functions (TypeScript)**. La base de datos PostgreSQL se usará principalmente como almacén de datos persistente y consistente.
*   **Programación Funcional/Declarativa:** Favorecer el uso de componentes funcionales de React y Hooks. Evitar el uso de componentes de clase. Escribir código declarativo que describa el *qué* en lugar del *cómo*.
*   **Modularidad y DRY:** Iterar y modularizar el código para adherirse a los principios DRY (Don't Repeat Yourself). Crear funciones y componentes reutilizables.
*   **Capas:** Frontend (React), Backend (Supabase - API, Auth, Edge Functions, DB).

## 4. Nomenclatura y Convenciones
*   **Idioma:**
    *   **Código (Identificadores):** Inglés (variables, funciones, clases, componentes, nombres de archivo, tablas, columnas).
    *   **Documentación y Comentarios:** **Español**.
*   **Formato de Código:**
    *   TypeScript/React: `camelCase` para variables y funciones/hooks. `PascalCase` para componentes React y tipos/interfaces.
    *   Archivos: `kebab-case` para nombres de archivo generales (ej: `use-auth-hook.ts`, `api-client.ts`), `PascalCase` para componentes React (ej: `UserProfile.tsx`).
    *   Base de Datos: `snake_case`.
*   **Nombres Descriptivos:** Utilizar nombres de variables descriptivos, especialmente para estados booleanos (ej: `isLoading`, `hasError`, `isSubmitting`).
*   **Componentes React:**
    *   Usar componentes funcionales y Hooks exclusivamente.
    *   Definir componentes usando la palabra clave `function`: `function MyComponent() {}`.
    *   Nombrar archivos de componentes con `PascalCase`.
*   **Organización de Archivos:**
    *   Organizar archivos de forma sistemática y cohesiva. Cada archivo debe contener contenido relacionado (ej: un componente y sus subcomponentes privados, tipos asociados, helpers locales). Considerar estructuras como `src/features/FeatureName/components`, `src/hooks`, `src/services`, `src/lib` (para utilidades), `src/types`.
    *   **Colocar tipos/interfaces y contenido estático relacionado al final del archivo** del componente/módulo.
*   **Exportaciones:** Favorecer las exportaciones nombradas (`export function MyComponent`) sobre las exportaciones por defecto.
*   **Patrón RORO (Receive an Object, Return an Object):** Para funciones o componentes con >2-3 parámetros/props o múltiples valores de retorno conceptuales, agruparlos en objetos para mejorar la legibilidad y flexibilidad.

## 5. Estilo de Código y Calidad
*   **Linting:** ESLint con configuración estricta (plugins React/Hooks/TypeScript).
*   **Formateo:** Prettier. **Configurar Prettier para omitir punto y coma al final de las declaraciones.**
*   **Sintaxis:**
    *   Usar `function` para funciones puras/componentes.
    *   **Evitar llaves innecesarias en condicionales de una sola línea**, si no afecta la legibilidad (configurable en ESLint/Prettier). Ej: `if (condition) return value;`.
*   **Tipado (TypeScript):**
    *   Utilizar TypeScript para todo el código.
    *   **Preferir Interfaces sobre Tipos (`type`)**: Usar `interface` para definir la forma de objetos o props. Usar `type` para uniones, primitivos o tipos complejos.
    *   **Evitar `enum`:** Usar objetos `as const` o mapas.
    *   Evitar `any`. Tipado estricto.
*   **Comentarios:** Escribir comentarios claros y concisos **en español** para lógica compleja o no obvia. Usar JSDoc/TSDoc.

## 6. Gestión del Estado (Frontend)
*   Minimizar el estado y `useEffect`. Favorecer lógica derivada y componentes puros.
*   Estado local (`useState`, `useReducer`) para estado de componente.
*   React Context API para estado global simple (tema, auth).
*   Evaluar Zustand si la complejidad global aumenta.

## 7. Manejo de Errores y Validación
*   **Priorizar manejo de errores y casos borde al inicio de las funciones.**
*   **Usar Retornos Tempranos (Early Returns) y Guard Clauses** para evitar anidamiento y mejorar legibilidad. El "happy path" debe ir al final.
*   **Evitar `else` innecesarios** usando el patrón `if-return`.
*   **Validación:** Usar **Zod** para definir esquemas y validar datos (formularios, respuestas API). Integrar con `react-hook-form`.
*   **Manejo de Errores API (Frontend):**
    *   Las funciones/hooks en `src/services` o `src/hooks` que interactúan con Supabase (API o Edge Functions) deben **capturar errores técnicos y lanzar/retornar errores manejables y user-friendly**.
    *   Modelar **errores esperados** (ej: código inválido, validación fallida) como parte del estado de retorno del hook/función (ej: `{ data: null, error: 'Código no encontrado' }`), no usar `try/catch` para control de flujo.
    *   Utilizar la librería `react-error-boundary` para capturar **errores inesperados** en el renderizado de componentes y mostrar un UI de fallback.
*   **Manejo de Errores (Backend - Edge Functions):**
    *   Validar datos de entrada (usando Zod si es posible).
    *   Utilizar `try...catch` para errores inesperados (ej: fallo de red, error de BD).
    *   Devolver respuestas de error estructuradas y consistentes (ej: `{ success: false, error: { code: '...', message: '...' } }`).
*   **Logging:** Implementar logging adecuado de errores (tanto en frontend como backend) para facilitar la depuración (ej: Sentry, Logflare con Supabase).

## 8. Comunicación API y Base de Datos
*   **Frontend:** Usar `supabase-js`. Centralizar llamadas en hooks/servicios.
*   **Edge Functions:** Usar `supabase-js` (con `service_role` o token de usuario).
*   **Seguridad DB (RLS):** Fundamental. Definir políticas explícitas.

## 9. Pruebas
*   **Unitarias:** Jest/Vitest + React Testing Library para lógica/componentes clave.
*   **Integración:** Probar interacción Frontend <-> Supabase.

## 10. UI y Estilos
*   Utilizar **Tailwind CSS** para todo el estilado.
*   Construir la interfaz utilizando componentes de **Shadcn UI** (que usa Radix UI internamente). Esto asegura accesibilidad y consistencia.
*   Implementar diseño responsive **mobile-first**.

## 11. Optimización de Rendimiento (Frontend)
*   **Web Vitals:** Monitorizar y optimizar (Lighthouse/WebPageTest).
*   **Carga Dinámica:** `React.lazy` y `Suspense` para componentes/rutas no críticas.
*   **Memoización:** `React.memo`, `useMemo`, `useCallback` con precaución.
*   **Optimización de Imágenes:** WebP, `width`/`height`, `loading="lazy"`.
*   **Chunking (Vite):** Revisar configuración si es necesario.
*   **Hooks Reutilizables:** Encapsular lógica en hooks (`react-use` o custom).

## 12. Control de Versiones (Git)
*   Repositorio, Ramas (`main`, `develop`, `feature/*`).
*   **Commits:** Mensajes claros y descriptivos **en español**, siguiendo [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).
*   **Pull Requests (PRs):** Hacia `develop`, requerir revisión.

## 13. Documentación
*   Mantener actualizados `REGLAS_PROYECTO.md`, `CONTEXTO_ALCANCE.md`, `INSTRUCCIONES_DESARROLLO.md`.
*   Comentar código fuente (en español).
*   `README.md` principal (instalación, ejecución).