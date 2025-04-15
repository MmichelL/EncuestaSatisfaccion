-- Migration: 20250413215000_create_finalize_survey_function.sql
-- Descripción: Crea la función finalize_survey para completar una respuesta de encuesta

-- Aseguramos que la extensión uuid-ossp esté disponible
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Función para finalizar una respuesta de encuesta y generar código de descuento
CREATE OR REPLACE FUNCTION public.finalize_survey(response_id_in BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con los privilegios del creador
AS $$
DECLARE
    v_response RECORD;
    v_survey RECORD;
    v_final_score INT;
    v_discount_code_value VARCHAR(100);
    v_expiry_date DATE;
    v_discount_code_id BIGINT;
    v_template VARCHAR(100);
    v_code_part VARCHAR(10);
BEGIN
    -- Obtener la respuesta y verificar que exista y esté en progreso
    SELECT sr.*, s.discount_code_validity_days, s.discount_code_template
    INTO v_response
    FROM public.survey_responses sr
    JOIN public.surveys s ON sr.survey_id = s.id
    WHERE sr.id = response_id_in;
    
    IF v_response IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'RESPONSE_NOT_FOUND',
                'message', 'La respuesta de encuesta no existe.'
            )
        );
    END IF;
    
    IF v_response.status != 'in_progress' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'ALREADY_COMPLETED',
                'message', 'Esta respuesta de encuesta ya ha sido finalizada o abandonada.'
            )
        );
    END IF;
    
    -- Obtener información de la encuesta
    SELECT *
    INTO v_survey
    FROM public.surveys
    WHERE id = v_response.survey_id;
    
    -- Calcular el porcentaje de descuento final
    -- Para MVP, obtenemos el máximo descuento acumulado de las secciones completadas
    -- basándonos en la última sección guardada
    IF v_response.last_saved_section_id IS NOT NULL THEN
        SELECT discount_percentage_cumulative
        INTO v_final_score
        FROM public.survey_sections
        WHERE id = v_response.last_saved_section_id;
    ELSE
        -- Si no hay sección guardada, asumimos 0% de descuento
        v_final_score := 0;
    END IF;
    
    -- Generar un código de descuento único basado en la plantilla de la encuesta
    v_template := v_survey.discount_code_template;
    v_code_part := substring(uuid_generate_v4()::text, 1, 8);
    
    -- Reemplazar placeholders en la plantilla
    v_discount_code_value := replace(v_template, '{PERCENT}', v_final_score::text);
    v_discount_code_value := replace(v_discount_code_value, '{CODE}', v_code_part);
    
    -- Calcular la fecha de expiración
    v_expiry_date := CURRENT_DATE + (v_response.discount_code_validity_days || ' days')::INTERVAL;
    
    -- Insertar el código de descuento en la tabla discount_codes
    INSERT INTO public.discount_codes (
        response_id,
        code_value,
        percentage,
        expiry_date
    ) VALUES (
        response_id_in,
        v_discount_code_value,
        v_final_score,
        v_expiry_date
    ) RETURNING id INTO v_discount_code_id;
    
    -- Actualizar la respuesta de encuesta
    UPDATE public.survey_responses
    SET 
        status = 'completed',
        completion_time = now(),
        discount_percentage_achieved = v_final_score,
        generated_discount_code = v_discount_code_value,
        updated_at = now()
    WHERE id = response_id_in;
    
    -- Si se usó un código de producto, marcarlo como usado
    IF v_response.product_code_id IS NOT NULL THEN
        UPDATE public.product_codes
        SET 
            status = 'used',
            used_at = now(),
            used_in_response_id = response_id_in
        WHERE id = v_response.product_code_id;
    END IF;
    
    -- Devolver el resultado exitoso
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'discount_code', v_discount_code_value,
            'valid_until', v_expiry_date,
            'percentage', v_final_score
        )
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Capturar cualquier error y devolverlo como JSON
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'FINALIZE_FAILED',
                'message', 'Error al finalizar la encuesta: ' || SQLERRM
            )
        );
END;
$$;

COMMENT ON FUNCTION public.finalize_survey(BIGINT) IS 'Finaliza una respuesta de encuesta, calcula el descuento, genera un código único y actualiza los registros relacionados.';
