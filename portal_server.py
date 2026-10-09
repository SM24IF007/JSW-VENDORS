"""Bounded multi-user server for the local Windows/Linux portal."""
import os


def run_portal(app):
    try:
        from waitress import serve
    except ImportError:
        raise SystemExit('Install the updated dependencies first: py -m pip install -r requirements.txt')
    host=os.environ.get('PORTAL_HOST','127.0.0.1')
    port=int(os.environ.get('PORTAL_PORT','5000'))
    threads=max(2,min(32,int(os.environ.get('PORTAL_THREADS','8'))))
    print(f'Portal ready at http://127.0.0.1:{port} - {threads} request threads',flush=True)
    if host=='0.0.0.0':print(f'LAN access: use this computer\'s LAN IP with port {port}.',flush=True)
    serve(app,host=host,port=port,threads=threads,connection_limit=100,
          channel_timeout=30,max_request_body_size=app.config['MAX_CONTENT_LENGTH'])
