@echo off
echo Desplegando todas las Edge Functions...

echo Desplegando Edge Function finalize-survey-response...
supabase functions deploy finalize-survey-response --project-ref gehbhfmqntffdwqjogbt

echo Desplegando Edge Function validate-product-code...
supabase functions deploy validate-product-code --project-ref gehbhfmqntffdwqjogbt

echo Desplegando Edge Function generate-product-codes...
supabase functions deploy generate-product-codes --project-ref gehbhfmqntffdwqjogbt

echo Desplegando Edge Function export-responses-csv...
supabase functions deploy export-responses-csv --project-ref gehbhfmqntffdwqjogbt

echo Desplegando Edge Function create-code-batch...
supabase functions deploy create-code-batch --project-ref gehbhfmqntffdwqjogbt

echo Despliegue completado.
pause
