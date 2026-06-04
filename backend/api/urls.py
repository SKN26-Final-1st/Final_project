from django.urls import path
from . import views

urlpatterns = [
    path("ping/", views.chat_test),
    path("chat-test/", views.chat_test),
]