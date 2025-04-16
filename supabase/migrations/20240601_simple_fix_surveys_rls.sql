-- Habilitar RLS en la tabla surveys
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Política para permitir a usuarios autenticados realizar todas las operaciones
CREATE POLICY "Usuarios autenticados pueden hacer todo en surveys" 
ON public.surveys 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para permitir a usuarios anónimos leer encuestas activas
CREATE POLICY "Usuarios anónimos pueden leer encuestas activas" 
ON public.surveys 
FOR SELECT 
TO anon
USING (is_active = true);
