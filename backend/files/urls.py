from django.urls import include, path
from rest_framework.routers import DefaultRouter

from files.views import (
    CompleteUploadView,
    DownloadURLView,
    FileViewSet,
    FolderViewSet,
    UploadURLView,
)


router = DefaultRouter()
router.register('folders', FolderViewSet, basename='folder')
router.register('files', FileViewSet, basename='file')

urlpatterns = [
    path('upload-url/', UploadURLView.as_view(), name='file-upload-url'),
    path('complete/', CompleteUploadView.as_view(), name='file-complete-upload'),
    path('<int:pk>/download-url/', DownloadURLView.as_view(), name='file-download-url'),
    path('', include(router.urls)),
]
