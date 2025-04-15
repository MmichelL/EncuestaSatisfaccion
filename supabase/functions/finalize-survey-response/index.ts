// supabase/functions/finalize-survey-response/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Esquema de validación usando Zod
const FinalizeSurveySchema = z.object({
  response_id: z.number().int().positive()
});

type FinalizeSurveyRequest = z.infer<typeof FinalizeSurveySchema>;

interface SuccessResponse {
  success: true;
  data: {
    discount_code: string;
    valid_until: string;
    percentage: number;
  };
}

interface ErrorResponse {
  success: false;
  error: {
    code: 'RESPONSE_NOT_FOUND' | 'ALREADY_COMPLETED' | 'FINALIZE_FAILED' | 'SERVER_ERROR' | 'VALIDATION_ERROR';
    message: string;
  };
}

type FinalizeSurveyResponse = SuccessResponse | ErrorResponse;

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
            code: 'VALIDATION_ERROR',
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
    const requestData = await req.json();
    
    // Validar los datos de entrada con Zod
    const validationResult = FinalizeSurveySchema.safeParse(requestData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos de entrada inválidos: ' + validationResult.error.message
          }
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    const { response_id } = validationResult.data;
    
    // Inicializar cliente de Supabase con clave de servicio
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Llamar a la función RPC finalize_survey
    const { data, error } = await supabase.rpc('finalize_survey', {
      response_id_in: response_id
    });
    
    if (error) {
      console.error('Error al llamar a finalize_survey:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'FINALIZE_FAILED',
            message: 'Error al finalizar la encuesta: ' + error.message
          }
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    // La función finalize_survey ya devuelve un objeto con la estructura correcta
    // Verificamos si la operación fue exitosa según la respuesta de la función
    if (data && data.success === true) {
      return new Response(
        JSON.stringify(data),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else {
      // Si la función devolvió un error, lo propagamos
      return new Response(
        JSON.stringify(data || {
          success: false,
          error: {
            code: 'FINALIZE_FAILED',
            message: 'Error desconocido al finalizar la encuesta.'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
  } catch (error) {
    // Capturar cualquier error no manejado
    console.error('Error en finalize-survey-response:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Error interno del servidor al finalizar la encuesta.'
        }
      } as ErrorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
