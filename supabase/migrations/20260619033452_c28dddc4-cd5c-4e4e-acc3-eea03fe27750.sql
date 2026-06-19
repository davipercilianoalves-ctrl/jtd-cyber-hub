
ALTER TABLE public.sale_overrides DROP CONSTRAINT IF EXISTS sale_overrides_ml_order_id_ml_item_id_key;
ALTER TABLE public.sale_overrides ADD CONSTRAINT sale_overrides_user_order_item_key UNIQUE (user_id, ml_order_id, ml_item_id);
