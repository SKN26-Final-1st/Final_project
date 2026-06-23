import time

from celery import shared_task


@shared_task
def test_celery_task(name):
    print(f"[Celery] task started: {name}")

    time.sleep(5)

    print(f"[Celery] task finished: {name}")

    return f"hello {name}"