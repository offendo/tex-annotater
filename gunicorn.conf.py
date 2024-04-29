# gunicorn.conf.py
import os
from dotenv import load_dotenv

for env_file in ('.env', '.flaskenv'):
    env = os.path.join(os.getcwd(), env_file)
    if os.path.exists(env):
        load_dotenv(env)

loglevel = 'debug'
accesslog = '/tmp/log/gunicorn/access_log_tex'
acceslogformat ="%(h)s %(l)s %(u)s %(t)s %(r)s %(s)s %(b)s %(f)s %(a)s"
errorlog =  '/tmp/log/gunicorn/error_log_tex'
