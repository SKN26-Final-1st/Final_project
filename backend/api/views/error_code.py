import os


ERROR_MESSAGES = {
    400: "400: No matching data found.",
    401: "401: Required field is missing.",
    402: "402: Invalid input value.",
    403: "403: Authentication is required.",
    404: "404: Permission denied.",
    405: "405: Request method is not allowed.",
    406: "406: Duplicate data exists.",
    407: "407: Operation is not allowed.",
    500: "500: Internal server error.",
}


def is_local_environment():
    return not bool(os.environ.get("IS_REMOTE_HOST"))


def _format_detail_messages(**details):
    return "\n".join(
        f"{key}: {value}"
        for key, value in details.items()
        if value
    )


def error_code(detailed_message: str = "", status: int = 500) -> str:
    message = ERROR_MESSAGES.get(status, ERROR_MESSAGES[500])
    details = _format_detail_messages(detailed_message=detailed_message)

    if is_local_environment() and details:
        return f"{message}\n{details}"

    return message
