#!/bin/bash
set -e

cd /var/app/staging/backend

PYTHON_BIN="$(find /var/app/venv -path '*/bin/python3*' -print -quit)"

if [ -z "$PYTHON_BIN" ]; then
    PYTHON_BIN="$(find /var/app/venv -path '*/bin/python*' -print -quit)"
fi

if [ -z "$PYTHON_BIN" ]; then
    echo "Could not find Elastic Beanstalk Python virtualenv."
    exit 1
fi

"$PYTHON_BIN" manage.py collectstatic --noinput