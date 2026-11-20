"""A tiny PixelLab REST client (API v2), standard library only.

Ported from assets/art-wip/level-2/pl.py. The key comes from the environment
variable PIXELLAB_API_KEY, else from the repo-root .env file (gitignored).
The key is only ever put in the Authorization header: never printed, logged
or written to a file.

    from pixellab import call, wait_job
    status, body = call('GET', '/balance')
"""
import base64
import http.client
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://api.pixellab.ai/v2'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Status codes worth trying a GET again: rate limit and server hiccups.
RETRY = {429, 500, 502, 503, 504}
# A POST may be a paid generation: after a 5xx or a network error PixelLab may still have
# accepted (and charged) it, so a POST is only sent again after 429 (rate limited: nothing accepted).
RETRY_POST = {429}
_key = None


class PixelLabError(Exception):
    pass


def api_key():
    """The API key, from the environment or the repo-root .env. Never print it."""
    global _key
    if _key:
        return _key
    k = os.environ.get('PIXELLAB_API_KEY', '').strip()
    env = os.path.join(ROOT, '.env')
    if not k and os.path.exists(env):
        for line in open(env, encoding='utf-8'):
            name, _, value = line.strip().partition('=')
            if name.strip() == 'PIXELLAB_API_KEY':
                k = value.strip().strip('"').strip("'")
    if not k:
        raise PixelLabError('PIXELLAB_API_KEY is not set (put it in the repo-root .env)')
    _key = k
    return k


def _request(method, url, body=None, auth=True, timeout=120, tries=5):
    """One HTTP call. A GET is retried on 429/5xx and network errors; a POST only on 429.
    Returns (status, raw bytes, headers)."""
    headers = {'User-Agent': 'matiur-art-pipeline'}
    if body is not None:
        headers['Content-Type'] = 'application/json'
    # Only PixelLab's own API gets the key, never a download host.
    send_key = auth and urllib.parse.urlparse(url).netloc == urllib.parse.urlparse(API).netloc
    data = None if body is None else json.dumps(body).encode()
    retry = RETRY if method == 'GET' else RETRY_POST
    delay = 2.0
    for attempt in range(tries):
        req = urllib.request.Request(url, method=method, data=data, headers=headers)
        if send_key:
            # Unredirected: if the API answers with a redirect, the key is not sent on to the new host.
            req.add_unredirected_header('Authorization', 'Bearer ' + api_key())
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read(), dict(r.headers)
        except urllib.error.HTTPError as e:
            raw = e.read()
            if e.code in retry and attempt < tries - 1:
                wait = float(e.headers.get('Retry-After') or delay)
                print(f'  {method} {url[len(API):] if url.startswith(API) else "download"}: {e.code}, retrying in {wait:.0f}s')
                time.sleep(wait)
                delay *= 2
                continue
            return e.code, raw, dict(e.headers)
        except (OSError, http.client.HTTPException) as e:
            # No answer: refused, timed out, or the connection dropped (urllib.error.URLError,
            # TimeoutError, http.client.RemoteDisconnected / IncompleteRead...).
            if method == 'GET' and attempt < tries - 1:
                print(f'  network error ({type(e).__name__}), retrying in {delay:.0f}s')
                time.sleep(delay)
                delay *= 2
                continue
            raise PixelLabError(f'{method} {url}: {e}') from None
    raise PixelLabError(f'{method} {url}: gave up')


def call(method, path, body=None, timeout=120):
    """Call an API path like '/balance'. Returns (status, parsed JSON or error text)."""
    st, raw, _ = _request(method, API + path, body, timeout=timeout)
    try:
        return st, json.loads(raw or b'null')
    except ValueError:
        return st, raw.decode('utf-8', 'replace')[:3000]


def download(url_or_path, timeout=120):
    """Bytes of a file: an API path ('/characters/x/zip') or a full URL."""
    url = url_or_path if url_or_path.startswith('http') else API + url_or_path
    st, raw, headers = _request('GET', url, timeout=timeout)
    if st >= 300:
        raise PixelLabError(f'GET {url_or_path}: {st} {raw[:300]!r}')
    return raw, headers


def wait_job(job_id, timeout=900, every=6):
    """Poll GET /background-jobs/{id} until it is no longer 'processing'. Returns the job."""
    end = time.time() + timeout
    while True:
        st, job = call('GET', f'/background-jobs/{job_id}')
        if st == 200 and isinstance(job, dict) and job.get('status') not in ('processing', 'queued', 'pending'):
            return job
        if st >= 400 and st not in RETRY:
            raise PixelLabError(f'job {job_id}: {st} {str(job)[:300]}')
        if time.time() > end:
            raise PixelLabError(f'job {job_id}: still processing after {timeout}s')
        time.sleep(every)


def b64(path_or_bytes):
    """A PNG as the API's Base64Image object."""
    raw = path_or_bytes if isinstance(path_or_bytes, bytes) else open(path_or_bytes, 'rb').read()
    return {'type': 'base64', 'base64': base64.b64encode(raw).decode(), 'format': 'png'}


def balance():
    """GET /balance (free). Returns the JSON or raises."""
    st, r = call('GET', '/balance')
    if st != 200:
        raise PixelLabError(f'/balance: {st} {str(r)[:300]}')
    return r
