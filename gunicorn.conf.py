# gunicorn.conf.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Source the env files
for env_file in ('.env', '.flaskenv'):
    env = os.path.join(os.getcwd(), env_file)
    if os.path.exists(env):
        load_dotenv(env)

# Make the log directory
Path('/tmp/log/gunicorn').mkdir(exist_ok=True, parents=True)

# gunicorn files
loglevel = 'debug'
#accesslog = '/tmp/log/gunicorn/access_log_tex'
acceslogformat ="%(h)s %(l)s %(u)s %(t)s %(r)s %(s)s %(b)s %(f)s %(a)s"
#errorlog =  '/tmp/log/gunicorn/error_log_tex'
errorlog = '-'
accesslog = '-'
