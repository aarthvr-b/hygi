-- Closing a Shift (ADR-0002): records how many of each Service were done as
-- Shift Lines, and marks the Shift Closed. p_counts is a JSON array of
-- {"service_id", "count"}; a count of zero means the Service wasn't done.
--
-- A new Line's unit price is copied from the Price List entry in force on the
-- Shift's date. Calling this again on a Closed Shift corrects it: Lines already
-- there keep the price they were closed with, whatever the Price List says now.
--
-- Runs with the caller's rights, so RLS keeps a hygienist to her own Shifts,
-- and in one transaction, so a Shift is never left half closed.
CREATE FUNCTION "public"."close_shift"("p_shift_id" uuid, "p_counts" jsonb) RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_shift public.shifts%ROWTYPE;
    v_unpriced text;
BEGIN
    SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift not found';
    END IF;

    DELETE FROM public.shift_lines AS l
    WHERE l.shift_id = p_shift_id
        AND NOT EXISTS (
            SELECT FROM jsonb_to_recordset(p_counts) AS c(service_id uuid, count integer)
            WHERE c.service_id = l.service_id AND c.count <> 0
        );

    UPDATE public.shift_lines AS l
    SET count = c.count
    FROM jsonb_to_recordset(p_counts) AS c(service_id uuid, count integer)
    WHERE l.shift_id = p_shift_id AND l.service_id = c.service_id;

    WITH added AS (
        SELECT c.service_id, c.count, (
            SELECT p.price_cents
            FROM public.studio_service_prices AS p
            WHERE p.studio_id = v_shift.studio_id
                AND p.service_id = c.service_id
                AND p.valid_from <= v_shift.date
            ORDER BY p.valid_from DESC
            LIMIT 1
        ) AS price_cents
        FROM jsonb_to_recordset(p_counts) AS c(service_id uuid, count integer)
        WHERE c.count <> 0
            AND NOT EXISTS (
                SELECT FROM public.shift_lines AS l
                WHERE l.shift_id = p_shift_id AND l.service_id = c.service_id
            )
    ), unpriced AS (
        SELECT string_agg(s.name, ', ' ORDER BY s.name) AS names
        FROM added
        JOIN public.services AS s ON s.id = added.service_id
        WHERE added.price_cents IS NULL
    ), inserted AS (
        INSERT INTO public.shift_lines (hygienist_id, shift_id, service_id, count, unit_price_cents)
        SELECT v_shift.hygienist_id, p_shift_id, added.service_id, added.count, added.price_cents
        FROM added
        WHERE added.price_cents IS NOT NULL
    )
    SELECT names INTO v_unpriced FROM unpriced;

    IF v_unpriced IS NOT NULL THEN
        RAISE EXCEPTION 'No Price is set at this Studio on the Shift''s date for: %', v_unpriced;
    END IF;

    UPDATE public.shifts SET closed_at = coalesce(closed_at, now()) WHERE id = p_shift_id;
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION "public"."close_shift"(uuid, jsonb) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."close_shift"(uuid, jsonb) TO authenticated, service_role;--> statement-breakpoint
-- A Closed Shift's Lines carry its Studio's prices, so it can't move to
-- another Studio. Its date and time of day can still be corrected.
CREATE FUNCTION "public"."keep_closed_shift_studio"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'A Closed Shift can''t be moved to another Studio';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "shifts_keep_closed_studio"
    BEFORE UPDATE OF "studio_id" ON "public"."shifts"
    FOR EACH ROW
    WHEN (OLD.closed_at IS NOT NULL AND NEW.studio_id IS DISTINCT FROM OLD.studio_id)
    EXECUTE FUNCTION "public"."keep_closed_shift_studio"();
