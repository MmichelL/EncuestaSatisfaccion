-- Migration: replace_import_survey_function
-- Descripción: Reemplaza la función import_survey_from_json para corregir error de cardinalidad

-- Eliminar la función existente para evitar conflictos
DROP FUNCTION IF EXISTS public.import_survey_from_json(jsonb);

-- Crear la función para importar encuestas desde JSON con correcciones para evitar error de cardinalidad
CREATE OR REPLACE FUNCTION public.import_survey_from_json(survey_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_survey_id BIGINT;
    new_section_id BIGINT;
    section_json JSONB;
    question_json JSONB;
    survey_name VARCHAR(255);
    survey_slug VARCHAR(255);
    survey_description TEXT;
    survey_requires_product_code BOOLEAN;
    survey_is_active BOOLEAN;
    survey_discount_code_template VARCHAR(100);
    survey_discount_code_validity_days INT;
    section_title VARCHAR(255);
    section_description TEXT;
    section_order INT;
    section_discount_percentage_cumulative INT;
    question_text TEXT;
    question_type VARCHAR(50);
    question_options JSONB;
    question_is_required BOOLEAN;
    question_order INT;
    log_message TEXT; -- Variable para mensajes de log
BEGIN
    RAISE NOTICE 'Inicio de import_survey_from_json';

    -- Extraer datos de la encuesta
    survey_name := survey_data -> 'survey' ->> 'name';
    survey_slug := survey_data -> 'survey' ->> 'slug';
    survey_description := survey_data -> 'survey' ->> 'description';
    survey_requires_product_code := (survey_data -> 'survey' ->> 'requires_product_code')::BOOLEAN;
    survey_is_active := (survey_data -> 'survey' ->> 'is_active')::BOOLEAN;
    survey_discount_code_template := survey_data -> 'survey' ->> 'discount_code_template';
    survey_discount_code_validity_days := (survey_data -> 'survey' ->> 'discount_code_validity_days')::INT;

    RAISE NOTICE 'Datos de encuesta extraídos: slug=%', survey_slug;

    -- Validaciones básicas
    IF survey_name IS NULL OR survey_slug IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'INVALID_DATA',
                'message', 'El nombre y el slug de la encuesta son obligatorios'
            )
        );
    END IF;

    -- Verificar si ya existe una encuesta con el mismo slug
    IF EXISTS (SELECT 1 FROM public.surveys WHERE slug = survey_slug) THEN
        RAISE NOTICE 'Error: Slug duplicado encontrado: %', survey_slug;
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'DUPLICATE_SLUG',
                'message', 'Ya existe una encuesta con el mismo slug: ' || survey_slug
            )
        );
    END IF;

    RAISE NOTICE 'Insertando encuesta: %', survey_name;
    -- Insertar la encuesta (sin RETURNING)
    INSERT INTO public.surveys (
        name,
        slug,
        description,
        requires_product_code,
        is_active,
        discount_code_template,
        discount_code_validity_days
    ) VALUES (
        survey_name,
        survey_slug,
        survey_description,
        COALESCE(survey_requires_product_code, FALSE),
        COALESCE(survey_is_active, TRUE),
        COALESCE(survey_discount_code_template, 'DESC{PERCENT}-{CODE}'),
        COALESCE(survey_discount_code_validity_days, 30)
    );
    
    -- Obtener el ID de la encuesta recién insertada en un paso separado
    SELECT id INTO new_survey_id FROM public.surveys WHERE slug = survey_slug;
    
    -- Verificar que se haya obtenido el ID correctamente
    IF new_survey_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo obtener el ID de la encuesta recién creada con slug: %', survey_slug;
    END IF;
    
    RAISE NOTICE 'Encuesta insertada con ID: %', new_survey_id;

    -- Iterar sobre las secciones
    IF survey_data -> 'sections' IS NOT NULL THEN
        RAISE NOTICE 'Iniciando bucle de secciones';
        FOREACH section_json IN ARRAY jsonb_array_elements(survey_data -> 'sections')
        LOOP
            -- Extraer datos de la sección
            section_title := section_json ->> 'title';
            section_description := section_json ->> 'description';
            section_order := (section_json ->> 'section_order')::INT;
            section_discount_percentage_cumulative := (section_json ->> 'discount_percentage_cumulative')::INT;

            -- Validaciones básicas de la sección
            IF section_title IS NULL OR section_order IS NULL OR section_discount_percentage_cumulative IS NULL THEN
                CONTINUE; -- Saltamos esta sección si faltan datos obligatorios
            END IF;

            RAISE NOTICE 'Insertando sección: % (Orden: %)', section_title, section_order;
            -- Insertar la sección (sin RETURNING)
            INSERT INTO public.survey_sections (
                survey_id,
                title,
                description,
                section_order,
                discount_percentage_cumulative
            ) VALUES (
                new_survey_id,
                section_title,
                section_description,
                section_order,
                section_discount_percentage_cumulative
            );
            
            -- Obtener el ID de la sección recién insertada en un paso separado
            SELECT id INTO new_section_id 
            FROM public.survey_sections 
            WHERE survey_id = new_survey_id AND section_order = section_order
            ORDER BY id DESC
            LIMIT 1;
            
            -- Verificar que se haya obtenido el ID correctamente
            IF new_section_id IS NULL THEN
                RAISE EXCEPTION 'No se pudo obtener el ID de la sección recién creada (Encuesta ID: %, Orden: %)', 
                                new_survey_id, section_order;
            END IF;
            
            RAISE NOTICE 'Sección insertada con ID: %', new_section_id;

            -- Iterar sobre las preguntas de esta sección
            IF section_json -> 'questions' IS NOT NULL THEN
                RAISE NOTICE 'Iniciando bucle de preguntas para sección ID: %', new_section_id;
                FOREACH question_json IN ARRAY jsonb_array_elements(section_json -> 'questions')
                LOOP
                    -- Extraer datos de la pregunta
                    question_text := question_json ->> 'question_text';
                    question_type := question_json ->> 'question_type';
                    question_options := question_json -> 'options';
                    question_is_required := (question_json ->> 'is_required')::BOOLEAN;
                    question_order := (question_json ->> 'question_order')::INT;

                    -- Validaciones básicas de la pregunta
                    IF question_text IS NULL OR question_type IS NULL OR question_order IS NULL THEN
                        CONTINUE; -- Saltamos esta pregunta si faltan datos obligatorios
                    END IF;

                    -- Validar que el tipo de pregunta sea válido
                    IF question_type NOT IN ('text_short', 'text_long', 'radio', 'checkbox', 'scale', 'dropdown', 'email', 'phone', 'name') THEN
                        CONTINUE; -- Saltamos esta pregunta si el tipo no es válido
                    END IF;

                    RAISE NOTICE 'Insertando pregunta: % (Orden: %)', question_text, question_order;
                    -- Insertar la pregunta
                    INSERT INTO public.questions (
                        section_id,
                        question_text,
                        question_type,
                        options,
                        is_required,
                        question_order
                    ) VALUES (
                        new_section_id,
                        question_text,
                        question_type,
                        question_options,
                        COALESCE(question_is_required, FALSE),
                        question_order
                    );
                    RAISE NOTICE 'Pregunta insertada para sección ID: %', new_section_id;
                END LOOP;
                RAISE NOTICE 'Fin bucle de preguntas para sección ID: %', new_section_id;
            END IF;
        END LOOP;
        RAISE NOTICE 'Fin bucle de secciones';
    END IF;

    RAISE NOTICE 'Importación completada exitosamente para encuesta ID: %', new_survey_id;
    -- Retornar éxito con el ID de la encuesta creada
    RETURN jsonb_build_object(
        'success', true,
        'surveyId', new_survey_id
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Capturar cualquier error y retornar un mensaje estructurado
        log_message := 'Error en import_survey_from_json: ' || SQLERRM || ' (SQLSTATE: ' || SQLSTATE || ')';
        RAISE NOTICE '%', log_message;
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'DB_IMPORT_ERROR',
                'message', 'Error interno de la base de datos durante la importación: ' || SQLERRM,
                'details', 'SQLSTATE: ' || SQLSTATE
            )
        );
END;
$$;

-- Comentario sobre la función
COMMENT ON FUNCTION public.import_survey_from_json(JSONB) IS 'Importa una encuesta completa con sus secciones y preguntas desde un objeto JSON. Retorna un objeto con {success: true, surveyId: ID} o {success: false, error: {...}}.';
