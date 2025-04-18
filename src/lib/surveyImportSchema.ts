import { z } from 'zod'

/**
 * Esquema para validar las opciones de preguntas tipo radio, checkbox, scale, dropdown
 * Las opciones pueden ser un array de objetos {value, label} o null
 */
const optionsSchema = z.union([
  z.array(
    z.object({
      value: z.string().min(1, 'El valor de la opción es requerido'),
      label: z.string().min(1, 'La etiqueta de la opción es requerida')
    })
  ).min(1, 'Debe proporcionar al menos una opción'),
  z.null()
]).optional().nullable()

/**
 * Esquema para validar una pregunta individual
 * Valida todos los campos de la tabla 'questions'
 */
export const questionImportSchema = z.object({
  question_text: z.string().min(1, 'El texto de la pregunta es requerido'),
  question_type: z.enum(['text_short', 'text_long', 'radio', 'checkbox', 'scale', 'dropdown', 'email', 'phone', 'name'], {
    errorMap: () => ({ message: 'El tipo de pregunta debe ser uno de los siguientes: text_short, text_long, radio, checkbox, scale, dropdown, email, phone, name' })
  }),
  options: optionsSchema.superRefine((val, ctx) => {
    // Validación adicional: ciertos tipos de preguntas requieren opciones
    const questionType = ctx.path[ctx.path.length - 2].toString() === 'questions' 
      ? ctx.parent.question_type 
      : null
    
    if (questionType && ['radio', 'checkbox', 'scale', 'dropdown'].includes(questionType) && !val) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Las preguntas de tipo ${questionType} requieren opciones`
      })
    }
  }),
  is_required: z.boolean().default(false),
  question_order: z.coerce.number().int('El orden debe ser un número entero').min(0, 'El orden no puede ser negativo')
})

/**
 * Esquema para validar una sección de encuesta
 * Valida todos los campos de la tabla 'survey_sections' más el array de preguntas
 */
export const sectionImportSchema = z.object({
  title: z.string().min(1, 'El título de la sección es requerido'),
  description: z.string().nullable().optional(),
  section_order: z.coerce.number().int('El orden debe ser un número entero').min(0, 'El orden no puede ser negativo'),
  discount_percentage_cumulative: z.coerce.number().int('El porcentaje debe ser un número entero')
    .min(0, 'El porcentaje no puede ser negativo')
    .max(100, 'El porcentaje no puede ser mayor a 100'),
  questions: z.array(questionImportSchema)
    .min(1, 'La sección debe tener al menos una pregunta')
    .superRefine((questions, ctx) => {
      // Validar que los órdenes de las preguntas sean únicos
      const orders = questions.map(q => q.question_order)
      const uniqueOrders = new Set(orders)
      
      if (orders.length !== uniqueOrders.size) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Los órdenes de las preguntas deben ser únicos dentro de una sección'
        })
      }
    })
})

/**
 * Esquema para validar el objeto survey (encuesta)
 * Valida todos los campos de la tabla 'surveys'
 */
export const surveySchema = z.object({
  name: z.string().min(1, 'El nombre de la encuesta es requerido'),
  slug: z.string().min(1, 'El slug es requerido')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug debe tener formato válido (solo letras minúsculas, números y guiones)'),
  description: z.string().nullable().optional(),
  is_active: z.boolean().default(false),
  requires_product_code: z.boolean().default(false),
  discount_code_template: z.string().min(1, 'La plantilla de código de descuento es requerida')
    .refine(
      template => template.includes('{PERCENT}') || template.includes('{CODE}'),
      'La plantilla debe incluir al menos uno de los placeholders: {PERCENT}, {CODE}'
    ),
  discount_code_validity_days: z.coerce.number().int('Los días de validez deben ser un número entero')
    .min(0, 'Los días de validez no pueden ser negativos')
})

/**
 * Esquema principal para validar la estructura completa del JSON de importación
 * Valida el objeto survey y el array de secciones
 */
const surveyImportSchema = z.object({
  survey: surveySchema,
  sections: z.array(sectionImportSchema)
    .min(1, 'La encuesta debe tener al menos una sección')
    .superRefine((sections, ctx) => {
      // Validar que los órdenes de las secciones sean únicos
      const orders = sections.map(s => s.section_order)
      const uniqueOrders = new Set(orders)
      
      if (orders.length !== uniqueOrders.size) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Los órdenes de las secciones deben ser únicos'
        })
      }
    })
})

export default surveyImportSchema
