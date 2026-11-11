# Compiled site. Build context: the repository root, because the interface shows
# JOURNAL_DES_MODIFICATIONS.md. Only static files end up in the final image.
FROM node:22-alpine AS build
WORKDIR /repo/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
COPY JOURNAL_DES_MODIFICATIONS.md /repo/
RUN npm run build

# Runs as the unprivileged nginx user (uid 101) and listens on 8080.
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=5 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/"]
