FROM gitlab.expertflow.com:9242/general/nginx:1.19.5-alpine-3.12-rbi-256

WORKDIR /usr/share/nginx/html

COPY dist/ .

COPY config.json.template .

COPY docker-entrypoint.sh .

RUN apk add tzdata gettext

RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["sh","./docker-entrypoint.sh"]
