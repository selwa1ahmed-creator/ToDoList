import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs
from typing import Any, Dict, cast

PORT = 8080
DB_FILE = 'database.json'

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/load':
            query = parse_qs(parsed_path.query)
            user = query.get('user', [''])[0]
            if not user:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "user parameter required"}')
                return
            
            data = {"lists": [], "items": {}}
            if os.path.exists(DB_FILE):
                with open(DB_FILE, 'r') as f:
                    try:
                        db = json.load(f)
                        data = db.get(user, {"lists": [], "items": {}})
                    except json.JSONDecodeError:
                        pass
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        else:
            super().do_GET()
            
    def do_POST(self):
        if self.path == '/api/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))
            
            user = payload.get('user')
            state = payload.get('state')
            
            if not user or state is None:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "user and state required"}')
                return

            db: Dict[str, Any] = {}
            if os.path.exists(DB_FILE):
                with open(DB_FILE, 'r') as f:
                    try:
                        data = json.load(f)
                        if isinstance(data, dict):
                            db = cast(Dict[str, Any], data)
                    except json.JSONDecodeError:
                        pass
            
            # Ensure user is used as a string key
            db[str(user)] = state
            
            with open(DB_FILE, 'w') as f:
                json.dump(db, f)
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"success": true}')
        else:
            self.send_response(404)
            self.end_headers()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Backend securely running! Starting server at http://localhost:{PORT}")
    httpd.serve_forever()
