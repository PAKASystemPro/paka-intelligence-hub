CREATE OR REPLACE FUNCTION public.count_line_items_for_period(start_date_param timestamptz, end_date_param timestamptz)
RETURNS integer AS $$
DECLARE
    line_item_count integer;
BEGIN
    SELECT count(*)
    INTO line_item_count
    FROM production.order_line_items oli
    JOIN production.orders o ON oli.order_id = o.id
    WHERE o.processed_at >= start_date_param AND o.processed_at <= end_date_param;

    RETURN line_item_count;
END;
$$ LANGUAGE plpgsql;
