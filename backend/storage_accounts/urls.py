from rest_framework.routers import DefaultRouter

from storage_accounts.views import StorageAccountViewSet


router = DefaultRouter()
router.register('', StorageAccountViewSet, basename='storage-account')

urlpatterns = router.urls
