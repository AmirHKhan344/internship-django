from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("upload-po/", views.upload_po, name="upload_po"),
    path("upload-coal/", views.upload_coal, name="upload_coal"),
]
