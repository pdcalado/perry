# Description: Dockerfile of image node-sqlite.
FROM node:14-buster

RUN apt update \
 && apt install -y sqlite3

FROM node:14-buster  
COPY --from=0 /usr/bin/sqlite3 /usr/bin/sqlite3

# Models API
COPY ./build/models /root/
COPY ./data.json /root/

# Dupe API
COPY ./build/node_sqlite3.node /root/dupe/
COPY ./build/dupe /root/dupe/
COPY ./build/latest-backup.sql /root/dupe/
COPY ./demo-dupe-config.toml /root/dupe/config.toml

# Event broker
COPY ./build/event-broker /root/event-broker/event-broker
COPY ./demo-event-broker-config.toml /root/event-broker/config.toml
COPY ./build/proto /root/proto/

# Caddy for reverse proxying
COPY ./build/caddy_linux_amd64_custom /root/caddy
COPY ./demo-Caddyfile /root/Caddyfile

# Bootstrap script
COPY ./run.sh /root/
RUN chmod +x /root/run.sh

EXPOSE 8000

WORKDIR /root/

ENTRYPOINT ["/root/run.sh"]
