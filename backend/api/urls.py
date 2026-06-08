from django.urls import path

from . import views


urlpatterns = [
    path("dbcheck/", views.dbcheck),
    path("csrf/", views.csrf_token),
    path("login/", views.account_login),
    path("logout/", views.account_logout),
    path("accounts/define/", views.account_define),
    path("accounts/modify/", views.account_modify),
    path("accounts/search/", views.account_search),
    path("compinfo/define/", views.compinfo_define),
    path("compinfo/modify/", views.compinfo_modify),
    path("compinfo/search/", views.compinfo_search),
    path("jd/define/", views.jd_define),
    path("jd/modify/", views.jd_modify),
    path("jd/search/", views.jd_search),
    path("resume/define/", views.resume_define),
    path("resume/modify/", views.resume_modify),
    path("resume/search/", views.resume_search),
    path("report/define/", views.report_define),
    path("report/modify/", views.report_modify),
    path("report/search/", views.report_search),
    path("question/define/", views.question_define),
    path("question/modify/", views.question_modify),
    path("question/search/", views.question_search),
]
