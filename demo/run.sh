#!/usr/bin/env bash

set -euf -o pipefail

./models --port 5001 &

sleep 2

cd dupe && ./dupe &

cd event-broker && ./event-broker -d -c config.toml &

./caddy run --config Caddyfile
