# API image. Build context: backend/. Nothing secret is copied or baked in:
# DATABASE_URL and the other settings are read from the environment at run time.
FROM python:3.12-slim AS build
WORKDIR /build
COPY requirements.lock .
# The lock file also pins the test tools: they stay out of the production image.
RUN grep -viE '^(pytest|pluggy|iniconfig|pygments|packaging|httpx|httpcore|certifi)==' requirements.lock > requirements.prod \
    && pip install --no-cache-dir --prefix=/install -r requirements.prod

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin runaway
COPY --from=build /install /usr/local
WORKDIR /app
COPY alembic.ini .
COPY migrations ./migrations
COPY app ./app
USER 10001
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
    CMD ["python", "-c", "import urllib.request as u; u.urlopen('http://127.0.0.1:8000/health', timeout=2)"]
# One worker on purpose: the creation quota lives in the memory of the process.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-server-header"]
