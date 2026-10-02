-- Shift generation (ADR-0001): materializes real Shift rows from Shift
-- Templates, from p_from through p_weeks later.
--
-- Runs with the caller's rights, so a signed-in hygienist tops up only her own
-- Templates (RLS) while the scheduled job below tops up everyone's. Each
-- Template is generated only past its generated_through mark, which makes the
-- job safe to re-run and keeps it from bringing back a Shift she deleted or
-- moved. Nothing is generated before p_from: there is no historical backfill.
CREATE FUNCTION "public"."materialize_shifts"(
	"p_from" date DEFAULT (now() AT TIME ZONE 'Europe/Rome')::date,
	"p_weeks" integer DEFAULT 12
) RETURNS integer
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
	v_through date := p_from + p_weeks * 7;
	v_generated integer;
BEGIN
	WITH due AS (
		SELECT id, hygienist_id, studio_id, time_of_day, anchor_date, interval_weeks,
			greatest(anchor_date, p_from, generated_through + 1) AS start_date
		FROM public.shift_templates
		WHERE generated_through IS NULL OR generated_through < v_through
		FOR UPDATE
	), generated AS (
		INSERT INTO public.shifts (hygienist_id, studio_id, template_id, date, time_of_day)
		SELECT due.hygienist_id, due.studio_id, due.id, occurrence.date, due.time_of_day
		FROM due
		CROSS JOIN LATERAL (
			SELECT due.anchor_date + n * due.interval_weeks * 7 AS date
			FROM generate_series(0, (v_through - due.anchor_date) / (due.interval_weeks * 7)) AS n
		) AS occurrence
		WHERE occurrence.date BETWEEN due.start_date AND v_through
		RETURNING 1
	), advanced AS (
		UPDATE public.shift_templates AS t
		SET generated_through = v_through
		FROM due
		WHERE t.id = due.id
	)
	SELECT count(*) INTO v_generated FROM generated;

	RETURN v_generated;
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION "public"."materialize_shifts"(date, integer) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."materialize_shifts"(date, integer) TO authenticated, service_role;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;--> statement-breakpoint
-- Daily at 03:00 UTC, keeping the rolling window topped up.
SELECT cron.schedule('materialize-shifts', '0 3 * * *', 'SELECT public.materialize_shifts()');
