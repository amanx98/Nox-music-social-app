import ssl
from typing import Optional
import httpx

def get_ssl_context() -> ssl.SSLContext:
    """
    Creates an SSL context that loads both default certs and system roots,
    preventing SSL certificate verification failures on Windows/macOS/Linux
    without disabling security.
    """
    ctx = ssl.create_default_context()
    try:
        ctx.load_default_certs()
    except Exception:
        pass
    return ctx

def get_async_client(timeout: float = 10.0, headers: Optional[dict] = None) -> httpx.AsyncClient:
    """
    Factory function for httpx.AsyncClient with verified system SSL context.
    """
    client_kwargs = {
        "verify": get_ssl_context(),
        "timeout": timeout,
    }
    if headers:
        client_kwargs["headers"] = headers
    return httpx.AsyncClient(**client_kwargs)
