"""
Request logging and performance monitoring middleware for GitPulse.

Logs HTTP method, path, response status, duration in milliseconds,
and client user email / IP address. Emits warnings for slow requests (>500ms)
and adds 'X-Process-Time-Ms' header to responses.
"""

import time
import logging

logger = logging.getLogger('gitpulse.request')


class RequestLoggingMiddleware:
    """
    Middleware that measures request execution time and logs key metrics.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.perf_counter()

        response = self.get_response(request)

        duration_ms = (time.perf_counter() - start_time) * 1000

        # Inject performance header
        response['X-Process-Time-Ms'] = f"{duration_ms:.2f}"

        # Capture client identity AFTER get_response so TokenAuthentication has populated request.user
        user_identifier = (
            request.user.email
            if hasattr(request, 'user') and request.user.is_authenticated
            else 'Anonymous'
        )

        client_ip = self.get_client_ip(request)

        log_message = (
            f"[{request.method}] {request.path} - "
            f"Status: {response.status_code} - "
            f"Time: {duration_ms:.2f}ms - "
            f"User: {user_identifier} - "
            f"IP: {client_ip}"
        )

        if duration_ms > 500:
            logger.warning(f"SLOW REQUEST: {log_message}")
        else:
            logger.info(log_message)

        return response

    @staticmethod
    def get_client_ip(request):
        """Extract client IP handling proxy forwarded headers."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '0.0.0.0')
