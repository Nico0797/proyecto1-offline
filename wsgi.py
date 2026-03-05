import os
import sys

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.main import create_app
from werkzeug.middleware.proxy_fix import ProxyFix

# Create the application instance for Gunicorn
app = create_app()

# Apply ProxyFix to handle headers from Railway/Nginx proxy correctly
# x_for=1: Trust the X-Forwarded-For header (client IP)
# x_proto=1: Trust the X-Forwarded-Proto header (http/https)
# x_host=1: Trust the X-Forwarded-Host header
# x_port=1: Trust the X-Forwarded-Port header
# x_prefix=1: Trust the X-Forwarded-Prefix header
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

if __name__ == "__main__":
    app.run()
