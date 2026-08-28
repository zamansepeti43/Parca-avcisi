import json
import re
import catalog_source_runner as runner


def sanitize(value):
    if isinstance(value, str):
        return value.replace('\x00', '')
    if isinstance(value, list):
        return [sanitize(v) for v in value]
    if isinstance(value, dict):
        return {k: sanitize(v) for k, v in value.items()}
    return value


def safe_post_batch(chunk, headers):
    clean_chunk = sanitize(chunk)
    return runner._original_post_batch(clean_chunk, headers)


runner._original_post_batch = runner.post_batch
runner.post_batch = safe_post_batch
runner.main()
