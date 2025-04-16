-- Consulta para obtener la estructura de la tabla code_batches
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'code_batches'
ORDER BY 
    ordinal_position;
