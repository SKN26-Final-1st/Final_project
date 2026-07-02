from django.urls import path

from . import views


urlpatterns = [
    path("ping/", views.ping),
    path("csrf/", views.csrf_token),
    path("signin/", views.account_signin),
    path("login/", views.account_login),
    path("logout/", views.account_logout),
    path("chat/", views.chat),
    path("jd_chat/", views.jd_chat),
    path("checkuser/", views.check_user),
    path("passqestion/", views.password_question),
    path("passreset/", views.password_reset),
    path("account/get/", views.account_get),
    path("account/modify/", views.account_modify),
    path("compinfo/get/", views.compinfo_get),
    path("compinfo/modify/", views.compinfo_modify),
    path("authkey/add/", views.authkey_add),
    path("authkey/get/", views.authkey_get),
    path("authkey/modify/", views.authkey_modify),
    path("jd/add/", views.jd_add),
    path("jd/analyze/", views.jd_analyze),
    path("jd/get/", views.jd_get),
    path("jd/modify/", views.jd_modify),
    path("checklist/add/", views.checklist_add),
    path("checklist/get/", views.checklist_get),
    path("checklist/modify/", views.checklist_modify),
    path("resume/add/", views.resume_add),
    path("resume/get/", views.resume_get),
    path("resume/modify/", views.resume_modify),
    path("resume/analyze/", views.resume_analyze),
    path("report/get/", views.report_get),
    path("report/modify/", views.report_modify),
]
