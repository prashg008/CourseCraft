#!/bin/sh
# Entrypoint script for Nginx with envsubst for CORS_ORIGIN
set -e


# Substitute environment variables in nginx.conf.template to default.conf
if [ -f /etc/nginx/nginx.conf.template ]; then
  envsubst '$CORS_ORIGIN' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
