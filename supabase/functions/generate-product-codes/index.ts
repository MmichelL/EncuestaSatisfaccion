// supabase/functions/generate-product-codes/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Esquema de validación usando Zod
const GenerateCodesSchema = z.object({
  batch_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(1000), // Limitamos a 1000 códigos por operación para evitar sobrecarga
  prefix: z.string().max(20).optional(),
  length: z.number().int().min(4).max(50) // Longitud mínima 4, máxima 50
});

type GenerateCodesRequest = z.infer<typeof GenerateCodesSchema>;

interface SuccessResponse {
  success: true;
  data: {
    count: number;
  };
}

interface ErrorResponse {
  success: false;
  error: {
    code: 'BATCH_NOT_FOUND' | 'VALIDATION_ERROR' | 'GENERATION_FAILED' | 'SERVER_ERROR';
    message: string;
  };
}

type GenerateCodesResponse = SuccessResponse | ErrorResponse;

// Configuración de Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Función para generar un código aleatorio
function generateRandomCode(length: number, prefix: string = ''): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluimos caracteres confusos como I, O, 0, 1
  let result = prefix;
  const randomLength = length - prefix.length;
  
  if (randomLength <= 0) {
    return prefix.substring(0, length);
  }
  
  for (let i = 0; i < randomLength; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

// Función para generar un lote de códigos únicos
async function generateUniqueCodes(
  supabase: any,
  quantity: number,
  prefix: string = '',
  length: number
): Promise<string[]> {
  const codes: string[] = [];
  const existingCodes = new Set<string>();
  
  // Primero, obtenemos todos los códigos existentes que podrían colisionar
  const prefixPattern = prefix ? `${prefix}%` : '%';
  const { data: existingCodesData, error: existingCodesError } = await supabase
    .from('product_codes')
    .select('code_value')
    .like('code_value', prefixPattern);
  
  if (existingCodesError) {
    throw new Error('Error al verificar códigos existentes');
  }
  
  // Agregamos los códigos existentes al conjunto para verificar colisiones
  existingCodesData.forEach((row: any) => {
    existingCodes.add(row.code_value);
  });
  
  // Generamos códigos únicos
  let attempts = 0;
  const maxAttempts = quantity * 10; // Límite de intentos para evitar bucles infinitos
  
  while (codes.length < quantity && attempts < maxAttempts) {
    attempts++;
    const newCode = generateRandomCode(length, prefix);
    
    // Verificamos que el código no exista ya en la base de datos ni en nuestro lote actual
    if (!existingCodes.has(newCode) && !codes.includes(newCode)) {
      codes.push(newCode);
      existingCodes.add(newCode); // Lo agregamos al conjunto para evitar duplicados en futuras iteraciones
    }
  }
  
  if (codes.length < quantity) {
    throw new Error(`No se pudieron generar ${quantity} códigos únicos después de ${maxAttempts} intentos`);
  }
  
  return codes;
}

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
    const validationResult = GenerateCodesSchema.safeParse(requestData);
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
    
    const { batch_id, quantity, prefix = '', length } = validationResult.data;
    
    // Inicializar cliente de Supabase con clave de servicio
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar que el lote existe
    const { data: batchData, error: batchError } = await supabase
      .from('code_batches')
      .select('id')
      .eq('id', batch_id)
      .single();
    
    if (batchError || !batchData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'BATCH_NOT_FOUND',
            message: 'El lote especificado no existe.'
          }
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }
    
    // Generar códigos únicos
    let uniqueCodes: string[];
    try {
      uniqueCodes = await generateUniqueCodes(supabase, quantity, prefix, length);
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'GENERATION_FAILED',
            message: `Error al generar códigos únicos: ${error.message}`
          }
        } as ErrorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    // Preparar los datos para inserción
    const codesToInsert = uniqueCodes.map(code => ({
      batch_id,
      code_value: code,
      status: 'available'
    }));
    
    // Insertar los códigos en la base de datos
    const { data: insertData, error: insertError } = await supabase
      .from('product_codes')
      .insert(codesToInsert)
      .select('id');
    
    if (insertError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'GENERATION_FAILED',
            message: `Error al insertar códigos en la base de datos: ${insertError.message}`
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
          count: insertData.length
        }
      } as SuccessResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    // Capturar cualquier error no manejado
    console.error('Error en generate-product-codes:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Error interno del servidor al generar códigos de producto.'
        }
      } as ErrorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
