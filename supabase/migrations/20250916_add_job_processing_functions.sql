-- Function to get the next job from the extraction queue
CREATE OR REPLACE FUNCTION get_next_extraction_job()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_job RECORD;
BEGIN
    -- Get the next queued job and mark it as processing atomically
    SELECT * INTO next_job
    FROM extraction_jobs
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- If we found a job, update its status
    IF FOUND THEN
        UPDATE extraction_jobs
        SET status = 'processing',
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = next_job.id;

        -- Return the job as JSON
        RETURN row_to_json(next_job);
    ELSE
        -- No jobs available
        RETURN NULL;
    END IF;
END;
$$;

-- Function to retry a failed job
CREATE OR REPLACE FUNCTION retry_failed_job(job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    job_record RECORD;
BEGIN
    -- Get the failed job
    SELECT * INTO job_record
    FROM extraction_jobs
    WHERE id = job_id AND status = 'failed';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check if job is eligible for retry
    IF job_record.retry_count >= job_record.max_retries THEN
        RETURN FALSE;
    END IF;

    -- Reset job for retry
    UPDATE extraction_jobs
    SET status = 'queued',
        retry_count = retry_count + 1,
        error_message = NULL,
        started_at = NULL,
        completed_at = NULL,
        updated_at = NOW()
    WHERE id = job_id;

    RETURN TRUE;
END;
$$;

-- Function to clean up old completed jobs (optional - for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_extraction_jobs(older_than_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete completed jobs older than specified days
    DELETE FROM extraction_jobs
    WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - INTERVAL '1 day' * older_than_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION get_next_extraction_job() TO service_role;
GRANT EXECUTE ON FUNCTION retry_failed_job(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_extraction_jobs(INTEGER) TO service_role;