# Gunicorn configuration file
import multiprocessing

bind = "0.0.0.0:10000"
workers = 2  # Keep low on free tier
worker_class = "sync"
timeout = 120  # 120 seconds - critical for AI processing
keepalive = 5
graceful_timeout = 30

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Development
reload = False
