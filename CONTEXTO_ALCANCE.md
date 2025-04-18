# CONTEXTO, VISIÓN Y ALCANCE DEL PROYECTO: SISTEMA DE ENCUESTAS DE SATISFACCIÓN

## 1. Contexto del Problema

Las empresas necesitan comprender la satisfacción de sus clientes después de una compra para mejorar productos, servicios y estrategias de marketing. Los métodos tradicionales de encuesta pueden tener bajas tasas de respuesta. Se busca una solución moderna que incentive la participación del cliente y centralice la gestión de las encuestas y sus resultados.

## 2. Visión del Producto

Crear una plataforma web integral que permita a las empresas:

*   Diseñar y lanzar encuestas de satisfacción post-compra de forma flexible.
*   Incentivar a los clientes a completar las encuestas ofreciendo descuentos incrementales basados en el progreso.
*   Distribuir el acceso a las encuestas fácilmente (URL/QR).
*   Opcionalmente, asegurar que solo los compradores reales respondan mediante códigos de producto únicos.
*   Gestionar centralizadamente las encuestas, los códigos y visualizar las respuestas de los clientes.
*   (Visión a Futuro) Construir perfiles de cliente basados en las respuestas para análisis y marketing dirigido.
*   (Visión a Futuro) Permitir a los clientes tener cuentas para gestionar sus encuestas y recompensas.

## 3. Objetivo del MVP (Producto Mínimo Viable)

El objetivo de esta primera versión (MVP) es entregar un sistema funcional que cubra las necesidades básicas de creación, respuesta y gestión de encuestas con descuentos incrementales y códigos de producto opcionales.

## 4. Usuarios Principales del MVP

1.  **Cliente Final:** Comprador que recibe un enlace/QR para acceder y responder una encuesta de satisfacción.
2.  **Administrador:** Empleado de la empresa usuaria de la plataforma, responsable de configurar las encuestas, gestionar los códigos y analizar las respuestas.

## 5. Alcance Funcional del MVP

### 5.1. Funcionalidades INCLUIDAS en el MVP:

*   **Módulo Cliente (Interfaz Pública):**
    *   Acceso a encuestas mediante URL única (puede requerir código de producto).
    *   Pantalla de ingreso de código de producto (si la encuesta lo requiere).
    *   Validación de códigos de producto (existencia, disponibilidad, vinculación a la encuesta a través de su lote).
    *   Interfaz moderna y responsiva para responder encuestas por secciones.
    *   Barra de progreso visual indicando el porcentaje de descuento acumulado.
    *   Navegación entre secciones (hacia adelante y hacia atrás).
    *   Soporte para diversos tipos de preguntas (texto corto/largo, opción única/múltiple, escala, dropdown, email, teléfono, nombre).
    *   Validación de respuestas obligatorias por sección.
    *   Guardado automático del progreso (estado y respuestas) en `localStorage` para poder retomar encuestas abandonadas.
    *   Opción de "Finalizar Encuesta" en cualquier momento (tras completar al menos una sección).
    *   Cálculo del descuento final basado en el porcentaje máximo acumulado de las secciones marcadas como completas.
    *   Generación y visualización de un código de descuento único al finalizar.
    *   Visualización de la fecha de validez del código de descuento.
    *   Botón para copiar fácilmente el código de descuento.
*   **Módulo de Administración (Interfaz Privada - React):**
    *   Autenticación segura para administradores (gestionada por Supabase Auth).
    *   Dashboard principal con estadísticas clave (widgets).
    *   Gestión CRUD (Crear, Leer, Actualizar, Eliminar) de Encuestas (nombre, descripción, activación, requerir código, plantilla de descuento, validez).
    *   Editor visual para añadir, eliminar y reordenar Secciones dentro de una encuesta (título, descripción, porcentaje acumulado).
    *   Editor visual para añadir, eliminar y reordenar Preguntas dentro de una sección (texto, tipo, opciones, obligatoria).
    *   Funcionalidad para importar una encuesta completa (detalles, secciones, preguntas) desde un archivo JSON validado.
    *   Opción para descargar una plantilla JSON de ejemplo con documentación integrada para facilitar la creación de encuestas.
    *   Gestión CRUD de Lotes de Códigos (nombre, descripción).
    *   Funcionalidad para generar códigos de producto únicos globalmente y asignarlos a un lote específico (cantidad, prefijo, longitud).
    *   Interfaz para vincular/desvincular Lotes de Códigos a Encuestas que requieren código.
    *   Visualización y filtrado de Códigos de Producto individuales (por lote, encuesta, estado).
    *   Visualización y filtrado de Respuestas de Encuestas (por encuesta, rango de fechas, estado).
    *   Vista detallada de una Respuesta individual (mostrando todas las preguntas y respuestas dadas).
    *   Funcionalidad para exportar las respuestas filtradas a formato CSV (formato plano detallado en `INSTRUCCIONES_DESARROLLO.md`).
    *   Sección de Configuración General básica (nombre empresa, logo - subida a Supabase Storage, plantilla descuento por defecto, validez descuento por defecto).

### 5.2. Funcionalidades EXCLUIDAS del MVP (Posibles Mejoras Futuras):

*   Aplicación directa del código de descuento en sistemas de e-commerce externos.
*   Integraciones automáticas con CRM o plataformas de e-commerce.
*   Gestión de múltiples empresas/cuentas en la misma instancia (arquitectura Multi-Tenant).
*   Roles de administrador detallados (RBAC - solo existe el rol "Admin").
*   Autenticación/Cuentas para Clientes Finales.
*   Construcción y visualización avanzada de Perfiles de Cliente agregados.
*   Verificación activa de email/teléfono proporcionado por el cliente.
*   Funcionalidad de realizar pedidos o acciones más allá de las encuestas.
*   Mecanismos avanzados de versionado de encuestas (más allá del snapshot de preguntas en las respuestas).
*   Pruebas End-to-End automatizadas.
*   Traducción de la interfaz a múltiples idiomas.

## 6. Factores de Éxito del MVP

*   La plataforma es estable y funcional para los casos de uso definidos.
*   La interfaz de cliente es intuitiva, atractiva y funciona correctamente en dispositivos móviles y de escritorio.
*   El sistema de descuentos incrementales y códigos de producto funciona como se espera.
*   Los administradores pueden gestionar eficazmente las encuestas y visualizar los datos.
*   La base de datos está correctamente estructurada y los datos son consistentes.
*   El código sigue los estándares definidos en `REGLAS_PROYECTO.md`.