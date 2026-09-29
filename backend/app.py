"""
NadiKampus Backend Runner
"""

import os
import sys

# Ensure root directory is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

def run_server():
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")

    try:
        import uvicorn
        from fastapi.staticfiles import StaticFiles
        from backend.api.main import app

        frontend_path = os.path.join(BASE_DIR, "frontend")
        if os.path.exists(frontend_path):
            app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

        print(f"[*] NadiKampus backend server running at http://localhost:{port}")
        uvicorn.run(app, host=host, port=port)
    except ImportError:
        import http.server
        import socketserver

        frontend_path = os.path.join(BASE_DIR, "frontend")
        os.chdir(frontend_path)

        class CustomHandler(http.server.SimpleHTTPRequestHandler):
            def end_headers(self):
                self.send_header("Access-Control-Allow-Origin", "*")
                super().end_headers()

        print(f"[*] NadiKampus fallback server running at http://localhost:{port}")
        with socketserver.TCPServer((host, port), CustomHandler) as httpd:
            httpd.serve_forever()

if __name__ == "__main__":
    run_server()
