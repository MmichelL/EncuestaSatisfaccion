// supabase/functions/_shared/cors.ts
// Configuración de CORS para las Edge Functions

// Permitir solicitudes desde cualquier origen para MVP
// En producción, esto debería limitarse a dominios específicos
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
