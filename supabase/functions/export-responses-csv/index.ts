// supabase/functions/export-responses-csv/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Configuración de Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Función para convertir JSON a CSV
function jsonToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Definir las columnas principales que queremos en el CSV
  const mainColumns = [
    'response_id',
    'survey_name',
    'status',
    'start_time',
    'completion_time',
    'discount_percentage_achieved',
    'generated_discount_code',
    'customer_name',
    'customer_email',
    'customer_phone',
    'customer_wants_offers'
  ];

  // Crear el encabezado del CSV
  let csvContent = mainColumns.map(col => `"${col}"`).join(',');

  // Determinar las columnas de respuestas dinámicamente
  // Primero, encontramos todas las preguntas únicas en todas las respuestas
  const questionMap = new Map<number, string>();
  
  data.forEach(row => {
    if (row.answers && Array.isArray(row.answers)) {
      row.answers.forEach((answer: any) => {
        if (answer.question_id && !questionMap.has(answer.question_id)) {
          // Usamos un nombre de columna que incluye el ID y texto de la pregunta
          const questionText = answer.question_text || `Pregunta ${answer.question_id}`;
          questionMap.set(answer.question_id, questionText);
        }
      });
    }
  });

  // Agregar encabezados de preguntas
  const questionIds = Array.from(questionMap.keys()).sort((a, b) => a - b);
  questionIds.forEach(qId => {
    csvContent += `,${escapeCSV(questionMap.get(qId) || '')}`;
  });
  
  csvContent += '\n';

  // Agregar filas de datos
  data.forEach(row => {
    // Agregar columnas principales
    const mainValues = mainColumns.map(col => {
      if (col === 'customer_wants_offers') {
        // Convertir booleano a Sí/No
        return row[col] === true ? '"Sí"' : row[col] === false ? '"No"' : '""';
      }
      return `"${escapeCSV(row[col] !== null && row[col] !== undefined ? String(row[col]) : '')}"`;
    });
    
    csvContent += mainValues.join(',');

    // Crear un mapa de respuestas para acceso rápido
    const answerMap = new Map<number, string>();
    if (row.answers && Array.isArray(row.answers)) {
      row.answers.forEach((answer: any) => {
        if (answer.question_id) {
          answerMap.set(answer.question_id, answer.answer_value || '');
        }
      });
    }

    // Agregar valores de respuestas en el orden de las columnas
    questionIds.forEach(qId => {
      csvContent += `,${escapeCSV(answerMap.get(qId) || '')}`;
    });

    csvContent += '\n';
  });

  return csvContent;
}

// Función para escapar valores en CSV
function escapeCSV(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  // Escapar comillas dobles duplicándolas y envolver en comillas si contiene caracteres especiales
  return value.replace(/"/g, '""');
}

// Función para formatear la fecha para el nombre del archivo
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

Deno.serve(async (req) => {
  // Manejo de CORS para solicitudes OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Aceptar tanto GET como POST
    if (req.method !== 'GET' && req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Método no permitido. Solo se acepta GET o POST.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405
        }
      );
    }
    
    // Obtener parámetros de filtro
    let surveyId: number | null = null;
    let startDate: string | null = null;
    let endDate: string | null = null;
    let status: string | null = null;
    
    if (req.method === 'POST') {
      // Obtener parámetros del cuerpo JSON
      const requestData = await req.json();
      surveyId = requestData.survey_id || null;
      startDate = requestData.startDate || null;
      endDate = requestData.endDate || null;
      status = requestData.status || null;
    } else {
      // Obtener parámetros de la URL para GET
      const url = new URL(req.url);
      const surveyIdParam = url.searchParams.get('survey_id');
      surveyId = surveyIdParam ? parseInt(surveyIdParam, 10) : null;
      startDate = url.searchParams.get('startDate');
      endDate = url.searchParams.get('endDate');
      status = url.searchParams.get('status');
    }
    
    // Inicializar cliente de Supabase con clave de servicio
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Llamar a la función RPC para obtener los datos
    const { data, error } = await supabase.rpc('get_survey_export_data', {
      survey_id_in: surveyId,
      start_date_in: startDate,
      end_date_in: endDate,
      status_in: status
    });
    
    if (error) {
      console.error('Error al obtener datos para exportación:', error);
      return new Response(
        JSON.stringify({
          error: 'Error al obtener datos para exportación: ' + error.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    // Verificar si hay un error en la respuesta de la función
    if (data && data.error) {
      return new Response(
        JSON.stringify({
          error: data.message || 'Error al obtener datos para exportación'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    // Verificar si hay datos
    if (!data || !Array.isArray(data) || data.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No se encontraron datos para exportar con los filtros proporcionados'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }
    
    // Convertir los datos a formato CSV
    const csvContent = jsonToCSV(data);
    
    // Generar nombre de archivo con fecha
    const today = new Date();
    const fileName = `respuestas_encuesta_${formatDate(today)}.csv`;
    
    // Devolver la respuesta con el contenido CSV
    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`
      },
      status: 200
    });
    
  } catch (error) {
    // Capturar cualquier error no manejado
    console.error('Error en export-responses-csv:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor al exportar respuestas: ' + error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
