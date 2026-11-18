import json, sys, base64, urllib.request
API='https://api.pixellab.ai/v2'
def call(method, path, body=None):
    req=urllib.request.Request(API+path, method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={'Authorization':'Bearer proxy-injected','Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r: return r.status, json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:3000]
def b64(path): return {'type':'base64','base64':base64.b64encode(open(path,'rb').read()).decode(),'format':'png'}
