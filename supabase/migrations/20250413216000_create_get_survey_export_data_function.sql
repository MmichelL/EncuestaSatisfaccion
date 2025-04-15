-- Migration: 20250413216000_create_get_survey_export_data_function.sql
-- Descripción: Crea la función get_survey_export_data para exportar respuestas de encuestas

-- Función para obtener datos de respuestas de encuestas para exportación
CREATE OR REPLACE FUNCTION public.get_survey_export_data(
    survey_id_in BIGINT DEFAULT NULL,
    start_date_in TIMESTAMPTZ DEFAULT NULL,
    end_date_in TIMESTAMPTZ DEFAULT NULL,
    status_in VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con los privilegios del creador
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Construir la consulta para obtener los datos de respuestas
    WITH response_data AS (
        SELECT
            sr.id AS response_id,
            s.name AS survey_name,
            s.id AS survey_id,
            sr.status,
            sr.start_time,
            sr.completion_time,
            sr.discount_percentage_achieved,
            sr.generated_discount_code,
            sr.customer_name,
            sr.customer_email,
            sr.customer_phone,
            sr.customer_wants_offers,
            sr.created_at,
            sr.updated_at,
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'question_id', a.question_id,
                        'question_text', a.question_text_at_response,
                        'question_type', a.question_type_at_response,
                        'answer_value', a.answer_value
                    )
                )
                FROM public.answers a
                WHERE a.response_id = sr.id
            ) AS answers
        FROM
            public.survey_responses sr
            JOIN public.surveys s ON sr.survey_id = s.id
        WHERE
            (survey_id_in IS NULL OR sr.survey_id = survey_id_in)
            AND (start_date_in IS NULL OR sr.created_at >= start_date_in)
            AND (end_date_in IS NULL OR sr.created_at <= end_date_in)
            AND (status_in IS NULL OR sr.status = status_in)
        ORDER BY
            sr.created_at DESC
    )
    
    SELECT jsonb_agg(
        jsonb_build_object(
            'response_id', rd.response_id,
            'survey_name', rd.survey_name,
            'survey_id', rd.survey_id,
            'status', rd.status,
            'start_time', rd.start_time,
            'completion_time', rd.completion_time,
            'discount_percentage_achieved', rd.discount_percentage_achieved,
            'generated_discount_code', rd.generated_discount_code,
            'customer_name', rd.customer_name,
            'customer_email', rd.customer_email,
            'customer_phone', rd.customer_phone,
            'customer_wants_offers', rd.customer_wants_offers,
            'created_at', rd.created_at,
            'updated_at', rd.updated_at,
            'answers', COALESCE(rd.answers, '[]'::jsonb)
        )
    )
    INTO v_result
    FROM response_data rd;
    
    -- Si no hay resultados, devolver un array vacío
    IF v_result IS NULL THEN
        v_result := '[]'::jsonb;
    END IF;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Capturar cualquier error y devolverlo como JSON
        RETURN jsonb_build_object(
            'error', true,
            'message', 'Error al obtener datos para exportación: ' || SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION public.get_survey_export_data(BIGINT, TIMESTAMPTZ, TIMESTAMPTZ, VARCHAR) IS 'Obtiene datos de respuestas de encuestas para exportación CSV, con filtros opcionales.';
