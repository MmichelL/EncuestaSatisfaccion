// supabase/functions/validate-product-code/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Definición de tipos para la solicitud y respuesta
interface ValidateCodeRequest {
  codeValue: string;
  surveyId?: number;
}

interface SuccessResponse {
  success: true;
  data: {
    code_id: number;
    batch_id: number;
  };
}

interface ErrorResponse {
  success: false;
  error: {
    code: 'INVALID_CODE' | 'CODE_USED' | 'CODE_NOT_FOR_SURVEY' | 'MISSING_PARAMS' | 'SERVER_ERROR';
    message: string;
  };
}

type ValidateCodeResponse = SuccessResponse | ErrorResponse;

// Configuración de Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req) => {
  // Manejo de CORS para solicitudes OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar que sea una solicitud POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'Método no permitido. Solo se acepta POST.'
          }
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405
        }
      );
    }

    // Parsear el cuerpo de la solicitud
    const requestData: ValidateCodeRequest = await req.json();
    const { codeValue, surveyId } = requestData;

    // Validar parámetros requeridos
    if (!codeValue) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'Se requiere el parámetro codeValue.'
          }
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Inicializar cliente de Supabase con clave de servicio
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar el código de producto
    const { data: codeData, error: codeError } = await supabase
      .from('product_codes')
      .select('id, batch_id, status')
      .eq('code_value', codeValue)
      .single();

    // Verificar si el código existe
    if (codeError || !codeData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_CODE',
            message: 'El código de producto no es válido.'
          }
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    // Verificar si el código ya ha sido utilizado
    if (codeData.status === 'used') {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'CODE_USED',
            message: 'Este código de producto ya ha sido utilizado.'
          }
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Si se proporciona surveyId, verificar que el código esté vinculado a la encuesta
    if (surveyId !== undefined) {
      // Primero verificamos si la encuesta requiere código
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('requires_product_code')
        .eq('id', surveyId)
        .single();

      if (surveyError || !surveyData) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'SERVER_ERROR',
              message: 'No se pudo verificar la encuesta.'
            }
          } as ErrorResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }

      // Si la encuesta requiere código, verificar la vinculación
      if (surveyData.requires_product_code) {
        const { data: linkData, error: linkError } = await supabase
          .from('survey_code_batches')
          .select('*')
          .eq('survey_id', surveyId)
          .eq('batch_id', codeData.batch_id);

        if (linkError || !linkData || linkData.length === 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'CODE_NOT_FOR_SURVEY',
                message: 'Este código no es válido para la encuesta seleccionada.'
              }
            } as ErrorResponse),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }
      }
    }

    // Si todo está bien, devolver respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          code_id: codeData.id,
          batch_id: codeData.batch_id
        }
      } as SuccessResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    /**
     * Capturar cualquier error no manejado
     *
     * Este bloque maneja errores inesperados que pueden ocurrir durante la ejecución
     * de la función. Registra el error en la consola para depuración y devuelve
     * una respuesta de error estructurada al cliente.
     */
    console.error('Error en validate-product-code:', error);

    // Determinar si es un error conocido o genérico
    const errorMessage = error instanceof Error
      ? `Error interno: ${error.message}`
      : 'Error interno del servidor al validar el código.';

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: errorMessage
        }
      } as ErrorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
