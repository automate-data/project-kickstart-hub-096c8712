UPDATE public.user_roles 
SET location_id = '8c102298-67ab-4228-95ed-b8ef3b8e665e'
WHERE user_id IN ('1f9bd178-df8b-483f-b82d-3ba1d97c05b6', '98476af4-0843-4cdf-9f27-fbfdd93bb637')
AND deleted_at IS NULL;