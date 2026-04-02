import os
import sys

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import from backend.main (The real application)
from backend.main import app
from werkzeug.middleware.proxy_fix import ProxyFix

# Apply ProxyFix to handle headers from Railway/Nginx proxy correctly
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

if __name__ == "__main__":
    port = int(app.config.get("PORT") or os.environ.get("PORT", 5000))
    print(f"WSGI backend local alineado a backend/main.py en http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=bool(app.config.get("DEBUG", False)))
