from django.urls import path

from files.views import CompleteUploadView, DownloadURLView, UploadURLView


urlpatterns = [
    path('upload-url/', UploadURLView.as_view(), name='file-upload-url'),
    path('complete/', CompleteUploadView.as_view(), name='file-complete-upload'),
    path('<int:pk>/download-url/', DownloadURLView.as_view(), name='file-download-url'),
]
