# Instrucciones para corregir el error de RLS en la tabla surveys

Has encontrado un error 403 (Forbidden) al intentar guardar una encuesta, lo que indica que hay un problema con las políticas de seguridad a nivel de fila (RLS) en Supabase para la tabla "surveys".

## Solución

Para solucionar este problema, necesitas aplicar las políticas RLS adecuadas en la tabla "surveys". Tienes dos opciones:

### Opción 1: Políticas detalladas (recomendado para producción)

El archivo `supabase/migrations/20240601_fix_surveys_rls.sql` contiene políticas RLS detalladas que:
- Permiten a usuarios anónimos leer solo encuestas activas
- Permiten a usuarios autenticados leer solo encuestas activas
- Permiten a administradores (correos específicos) realizar todas las operaciones CRUD

### Opción 2: Solución rápida (solo para desarrollo)

El archivo `supabase/migrations/20240601_simple_fix_surveys_rls.sql` contiene una solución más simple que:
- Permite a cualquier usuario autenticado realizar todas las operaciones
- Permite a usuarios anónimos leer solo encuestas activas

## Cómo aplicar las políticas

1. Inicia sesión en el panel de control de Supabase
2. Ve a la sección "SQL Editor"
3. Copia y pega el contenido del archivo SQL que prefieras usar
4. Ejecuta la consulta

Alternativamente, puedes usar la CLI de Supabase para aplicar la migración:

```bash
supabase db push
```

## Verificación

Después de aplicar las políticas, intenta crear una encuesta nuevamente. Si sigues teniendo problemas, asegúrate de:

1. Estar correctamente autenticado
2. Que tu correo electrónico esté incluido en la lista de administradores (si usas la opción 1)
3. Que la tabla "surveys" tenga RLS habilitado

## Nota importante

Si estás en un entorno de producción, es recomendable usar la Opción 1 con políticas detalladas y asegurarte de incluir solo los correos electrónicos de los administradores autorizados.
