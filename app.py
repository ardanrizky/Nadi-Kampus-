"""
NadiKampus Intelligence Console — Main Application Runner
Serves both the interactive frontend and RESTful API endpoints.
"""

import os
import sys

def run_server():
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")

    try:
        import uvicorn
        from fastapi.staticfiles import StaticFiles
        from api.main import app

        frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
        if os.path.exists(frontend_path):
            app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

        print(f"🌿 NadiKampus server running at http://localhost:{port}")
        uvicorn.run(app, host=host, port=port)
    except ImportError:
        # Fallback to standard library HTTP server if dependencies are not installed
        import http.server
        import socketserver

        frontend_path = os.path.join(os.path.dirname(__file__), "frontend")
        os.chdir(frontend_path)

        class CustomHandler(http.server.SimpleHTTPRequestHandler):
            def end_headers(self):
                self.send_header("Access-Control-Allow-Origin", "*")
                super().end_headers()

        print(f"🌿 NadiKampus fallback server running at http://localhost:{port}")
        with socketserver.TCPServer((host, port), CustomHandler) as httpd:
            httpd.serve_forever()

if __name__ == "__main__":
    run_server()
