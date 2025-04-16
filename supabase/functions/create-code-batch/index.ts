// supabase/functions/create-code-batch/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Esquema de validación usando Zod
const CreateCodeBatchSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  prefix: z.string().min(1, 'El prefijo es requerido'),
  quantity: z.number().int().min(1).max(1000),
  length: z.number().int().min(4).max(50)
});

type CreateCodeBatchRequest = z.infer<typeof CreateCodeBatchSchema>;

interface SuccessResponse {
  success: true;
  data: {
    batch_id: string;
    name: string;
  };
}

interface ErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'CREATION_FAILED' | 'SERVER_ERROR';
    message: string;
  };
}

type CreateCodeBatchResponse = SuccessResponse | ErrorResponse;

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
    const validationResult = CreateCodeBatchSchema.safeParse(requestData);
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
    
    const { name, description, prefix, quantity, length } = validationResult.data;
    
    // Inicializar cliente de Supabase con clave de servicio
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Insertar el nuevo lote de códigos
    const { data: batchData, error: batchError } = await supabase
      .from('code_batches')
      .insert([
        {
          name,
          description: description || null
        }
      ])
      .select()
      .single();
    
    if (batchError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'CREATION_FAILED',
            message: `Error al crear el lote de códigos: ${batchError.message}`
          }
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    // Generar códigos para el lote
    const { error: functionError } = await supabase.functions.invoke('generate-product-codes', {
      body: {
        batch_id: batchData.id,
        prefix,
        quantity,
        length
      }
    });
    
    if (functionError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'CREATION_FAILED',
            message: `Error al generar los códigos: ${functionError.message}`
          }
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    // Devolver respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          batch_id: batchData.id,
          name: batchData.name
        }
      } as SuccessResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    // Capturar cualquier error no manejado
    console.error('Error en create-code-batch:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Error interno del servidor al crear el lote de códigos.'
        }
      } as ErrorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
