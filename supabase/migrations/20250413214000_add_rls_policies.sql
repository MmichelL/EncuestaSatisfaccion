-- Migration: 20250413214000_add_rls_policies.sql
-- Descripción: Implementa políticas de seguridad a nivel de fila (RLS) para todas las tablas

-- Primero, modificamos la tabla survey_responses para añadir user_id
ALTER TABLE public.survey_responses ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.survey_responses.user_id IS 'Referencia al usuario autenticado que creó esta respuesta (si aplica).';

-- Habilitar RLS en todas las tablas
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_code_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para verificar si un usuario es administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar para verificar si una encuesta está activa
CREATE OR REPLACE FUNCTION public.is_survey_active(survey_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.surveys WHERE id = survey_id AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar para verificar si el usuario es propietario de una respuesta
CREATE OR REPLACE FUNCTION public.is_response_owner(response_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.survey_responses 
    WHERE id = response_id AND (
      user_id = auth.uid() OR 
      (user_id IS NULL AND created_at > now() - interval '24 hours')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para admin_profiles
CREATE POLICY "Los administradores pueden ver todos los perfiles de administrador"
  ON public.admin_profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los administradores pueden crear perfiles de administrador"
  ON public.admin_profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden actualizar perfiles de administrador"
  ON public.admin_profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden eliminar perfiles de administrador"
  ON public.admin_profiles FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los usuarios pueden ver su propio perfil de administrador"
  ON public.admin_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Políticas para customers
CREATE POLICY "Los administradores pueden ver todos los clientes"
  ON public.customers FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los administradores pueden crear clientes"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden actualizar clientes"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden eliminar clientes"
  ON public.customers FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Usuarios anónimos pueden crear clientes (vía Edge Functions)"
  ON public.customers FOR INSERT
  TO anon
  WITH CHECK (true);

-- Políticas para surveys
CREATE POLICY "Todos pueden ver encuestas activas"
  ON public.surveys FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Los administradores pueden ver todas las encuestas"
  ON public.surveys FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los administradores pueden crear encuestas"
  ON public.surveys FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden actualizar encuestas"
  ON public.surveys FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden eliminar encuestas"
  ON public.surveys FOR DELETE
  TO authenticated
  USING (is_admin());

-- Políticas para survey_sections
CREATE POLICY "Todos pueden ver secciones de encuestas activas"
  ON public.survey_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE id = survey_id AND is_active = TRUE
  ));

CREATE POLICY "Los administradores pueden ver todas las secciones"
  ON public.survey_sections FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los administradores pueden crear secciones"
  ON public.survey_sections FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden actualizar secciones"
  ON public.survey_sections FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden eliminar secciones"
  ON public.survey_sections FOR DELETE
  TO authenticated
  USING (is_admin());

-- Políticas para questions
CREATE POLICY "Todos pueden ver preguntas de encuestas activas"
  ON public.questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.survey_sections ss
    JOIN public.surveys s ON ss.survey_id = s.id
    WHERE ss.id = section_id AND s.is_active = TRUE
  ));

CREATE POLICY "Los administradores pueden ver todas las preguntas"
  ON public.questions FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los administradores pueden crear preguntas"
  ON public.questions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden actualizar preguntas"
  ON public.questions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden eliminar preguntas"
  ON public.questions FOR DELETE
  TO authenticated
  USING (is_admin());

-- Políticas para code_batches
CREATE POLICY "Los administradores pueden ver todos los lotes de códigos"
  ON public.code_batches FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los administradores pueden crear lotes de códigos"
  ON public.code_batches FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden actualizar lotes de códigos"
  ON public.code_batches FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden eliminar lotes de códigos"
  ON public.code_batches FOR DELETE
  TO authenticated
  USING (is_admin());

-- Políticas para product_codes
CREATE POLICY "Los administradores pueden ver todos los códigos de producto"
  ON public.product_codes FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los administradores pueden crear códigos de producto"
  ON public.product_codes FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden actualizar códigos de producto"
  ON public.product_codes FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden eliminar códigos de producto"
  ON public.product_codes FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Verificación de códigos de producto para encuestas (vía Edge Functions)"
  ON public.product_codes FOR SELECT
  TO anon
  USING (status = 'available');

-- Políticas para survey_code_batches
CREATE POLICY "Los administradores pueden ver todas las relaciones encuesta-lote"
  ON public.survey_code_batches FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los administradores pueden crear relaciones encuesta-lote"
  ON public.survey_code_batches FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden eliminar relaciones encuesta-lote"
  ON public.survey_code_batches FOR DELETE
  TO authenticated
  USING (is_admin());

-- Políticas para survey_responses
CREATE POLICY "Usuarios anónimos pueden crear respuestas"
  ON public.survey_responses FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND is_active = TRUE)
  );

CREATE POLICY "Usuarios autenticados pueden crear respuestas"
  ON public.survey_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND is_active = TRUE)
  );

CREATE POLICY "Los usuarios pueden ver sus propias respuestas"
  ON public.survey_responses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Los usuarios anónimos pueden ver sus respuestas recientes"
  ON public.survey_responses FOR SELECT
  TO anon
  USING (
    user_id IS NULL AND 
    created_at > now() - interval '24 hours'
  );

CREATE POLICY "Los usuarios pueden actualizar sus propias respuestas"
  ON public.survey_responses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Los usuarios anónimos pueden actualizar sus respuestas recientes"
  ON public.survey_responses FOR UPDATE
  TO anon
  USING (
    user_id IS NULL AND 
    created_at > now() - interval '24 hours'
  )
  WITH CHECK (
    user_id IS NULL AND 
    created_at > now() - interval '24 hours'
  );

CREATE POLICY "Los administradores pueden ver todas las respuestas"
  ON public.survey_responses FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los administradores pueden actualizar todas las respuestas"
  ON public.survey_responses FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden eliminar respuestas"
  ON public.survey_responses FOR DELETE
  TO authenticated
  USING (is_admin());

-- Políticas para answers
CREATE POLICY "Usuarios pueden crear respuestas a preguntas"
  ON public.answers FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    is_response_owner(response_id)
  );

CREATE POLICY "Usuarios pueden ver sus propias respuestas a preguntas"
  ON public.answers FOR SELECT
  USING (
    is_response_owner(response_id)
  );

CREATE POLICY "Usuarios pueden actualizar sus propias respuestas a preguntas"
  ON public.answers FOR UPDATE
  USING (
    is_response_owner(response_id)
  )
  WITH CHECK (
    is_response_owner(response_id)
  );

CREATE POLICY "Los administradores pueden ver todas las respuestas a preguntas"
  ON public.answers FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los administradores pueden actualizar todas las respuestas a preguntas"
  ON public.answers FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden eliminar respuestas a preguntas"
  ON public.answers FOR DELETE
  TO authenticated
  USING (is_admin());

-- Políticas para discount_codes
CREATE POLICY "Los usuarios pueden ver sus propios códigos de descuento"
  ON public.discount_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses
      WHERE id = response_id AND (
        user_id = auth.uid() OR
        (user_id IS NULL AND created_at > now() - interval '24 hours')
      )
    )
  );

CREATE POLICY "Los administradores pueden ver todos los códigos de descuento"
  ON public.discount_codes FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Los administradores pueden crear códigos de descuento"
  ON public.discount_codes FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden actualizar códigos de descuento"
  ON public.discount_codes FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Los administradores pueden eliminar códigos de descuento"
  ON public.discount_codes FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Edge Functions pueden crear códigos de descuento"
  ON public.discount_codes FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.survey_responses
      WHERE id = response_id AND (
        user_id = auth.uid() OR
        (user_id IS NULL AND created_at > now() - interval '24 hours')
      )
    )
  );
