-- Habilitar RLS en la tabla surveys
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para la tabla surveys (si existen)
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer encuestas activas" ON public.surveys;
DROP POLICY IF EXISTS "Administradores pueden leer todas las encuestas" ON public.surveys;
DROP POLICY IF EXISTS "Administradores pueden insertar encuestas" ON public.surveys;
DROP POLICY IF EXISTS "Administradores pueden actualizar encuestas" ON public.surveys;
DROP POLICY IF EXISTS "Administradores pueden eliminar encuestas" ON public.surveys;

-- Crear políticas para la tabla surveys

-- Política para permitir a usuarios anónimos leer encuestas activas
CREATE POLICY "Usuarios anónimos pueden leer encuestas activas" 
ON public.surveys 
FOR SELECT 
TO anon
USING (is_active = true);

-- Política para permitir a usuarios autenticados leer encuestas activas
CREATE POLICY "Usuarios autenticados pueden leer encuestas activas" 
ON public.surveys 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Política para permitir a administradores leer todas las encuestas
CREATE POLICY "Administradores pueden leer todas las encuestas" 
ON public.surveys 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IN (
    SELECT auth.uid() 
    FROM auth.users 
    WHERE auth.email() IN (
      'admin@example.com', 
      'misaelmichell@hotmail.com'
      -- Añadir aquí otros correos de administradores
    )
  )
);

-- Política para permitir a administradores insertar encuestas
CREATE POLICY "Administradores pueden insertar encuestas" 
ON public.surveys 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT auth.uid() 
    FROM auth.users 
    WHERE auth.email() IN (
      'admin@example.com', 
      'misaelmichell@hotmail.com'
      -- Añadir aquí otros correos de administradores
    )
  )
);

-- Política para permitir a administradores actualizar encuestas
CREATE POLICY "Administradores pueden actualizar encuestas" 
ON public.surveys 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT auth.uid() 
    FROM auth.users 
    WHERE auth.email() IN (
      'admin@example.com', 
      'misaelmichell@hotmail.com'
      -- Añadir aquí otros correos de administradores
    )
  )
) 
WITH CHECK (
  auth.uid() IN (
    SELECT auth.uid() 
    FROM auth.users 
    WHERE auth.email() IN (
      'admin@example.com', 
      'misaelmichell@hotmail.com'
      -- Añadir aquí otros correos de administradores
    )
  )
);

-- Política para permitir a administradores eliminar encuestas
CREATE POLICY "Administradores pueden eliminar encuestas" 
ON public.surveys 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IN (
    SELECT auth.uid() 
    FROM auth.users 
    WHERE auth.email() IN (
      'admin@example.com', 
      'misaelmichell@hotmail.com'
      -- Añadir aquí otros correos de administradores
    )
  )
);
