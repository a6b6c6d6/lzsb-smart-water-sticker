"""
验证台静态服务器。
- /topic/<id>          → 仿真帖子页（装了液态玻璃脚本）
- /noglass/topic/<id>  → 同上但**不加载**液态玻璃脚本（零副作用回归用）
- /water.user.js       → 直接读仓库根目录里那份真身，不做拷贝
- /glass.user.js       → _verify/ 下按版本钉住的液态玻璃脚本（v1.7.5，MIT）
"""
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PORT = 8899


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, body, ctype):
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def _file(self, *parts):
        with open(os.path.join(*parts), 'rb') as f:
            return f.read()

    def do_GET(self):
        path = self.path.split('?')[0]
        if '/noglass/' in path:
            self._send(self._file(HERE, 'harness_noglass.html'), 'text/html; charset=utf-8')
        elif path.startswith('/topic/') or path == '/':
            self._send(self._file(HERE, 'harness.html'), 'text/html; charset=utf-8')
        elif path == '/water.user.js':
            self._send(self._file(ROOT, 'linux.sb-ai-reply.user.js'),
                       'application/javascript; charset=utf-8')
        elif path == '/glass.user.js':
            self._send(self._file(HERE, 'glass.user.js'),
                       'application/javascript; charset=utf-8')
        else:
            self.send_error(404)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print('serving on http://127.0.0.1:%d' % PORT, flush=True)
    srv.serve_forever()
