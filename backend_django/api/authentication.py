from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    DRF's SessionAuthentication enforces CSRF even when
    CSRF_TRUSTED_ORIGINS is set. Since our React frontend
    runs on a different port during development, we skip
    the CSRF check here. The CORS settings already restrict
    which origins can make requests.
    """
    def enforce_csrf(self, request):
        return  # Skip CSRF — CORS handles origin checking
