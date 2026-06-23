from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        from .tasks import initialize_celery_worker_availability

        initialize_celery_worker_availability()
