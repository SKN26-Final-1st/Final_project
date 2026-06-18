
ACCOUNT_BLOCKED_FIELDS = {"id", "username", "account_hash"}

COMPANY_INFO_BLOCKED_FIELDS = {"id", "account", "account_id"}

AUTH_KEY_BLOCKED_FIELDS = {"id", "account", "account_id", "value"}
AUTH_KEY_ADD_BLOCKED_FIELDS = AUTH_KEY_BLOCKED_FIELDS | {"authorized_resume"}
AUTH_KEY_ADD_ALLOWED_FIELDS = {"name", "description", "credit_limit"}
AUTH_KEY_MODIFY_CONTROL_FIELDS = {"delete"}
AUTH_KEY_MODIFY_BLOCKED_FIELDS = AUTH_KEY_BLOCKED_FIELDS - {"id"}

JOB_DESCRIPTION_BLOCKED_FIELDS = {"id", "account", "account_id", "created_at", "updated_at"}
JOB_DESCRIPTION_ADD_BLOCKED_FIELDS = JOB_DESCRIPTION_BLOCKED_FIELDS

CHECKLIST_BLOCKED_FIELDS = {"id", "job_description", "job_description_id"}
CHECKLIST_ADD_ALLOWED_FIELDS = {"job_description_id", "content"}

RESUME_BLOCKED_FIELDS = {"id", "created_at", "updated_at", "status", "reviewed", "reviewed_at"}
RESUME_ADD_BLOCKED_FIELDS = RESUME_BLOCKED_FIELDS
RESUME_ADD_ALLOWED_FIELDS = {
    "job_description_id",
    "name",
    "skill",
    "education_level",
    "experience",
    "self_intoduction",
    "certification",
    "language",
    "award",
    "training",
    "other_activity",
}
RESUME_MODIFY_BLOCKED_FIELDS = RESUME_BLOCKED_FIELDS | {"job_description", "job_description_id"}

REPORT_BLOCKED_FIELDS = {"id", "resume", "resume_id"}
