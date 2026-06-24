# Lab 10 — backend Dockerfile. Author this file.
#
# TODO: choose a slim Python base image so the runtime is small.
# TODO: order layers so dependency install is cached between rebuilds
#       (install requirements before copying the rest of the source).
# TODO: install the spaCy English model needed by /extract.
# TODO: expose the FastAPI port and start uvicorn against `api.main:app`
#       with the build context set to the repo root (NOT `cd api &&
#       uvicorn main:app`). The starter uses package-relative imports
#       (`from .models import Entity`), which require uvicorn to load the
#       package as `api.*` — running `uvicorn main:app` from inside the
#       `api/` directory breaks these imports with `ImportError:
#       attempted relative import with no known parent package`.
#
# See lab-guide.md "Containerization" section for the constraints the
# autograder will check.

FROM python:3.11-slim

WORKDIR /app

COPY api/requirements.txt ./api/
RUN pip install --no-cache-dir -r api/requirements.txt
RUN python -m spacy download en_core_web_sm

COPY api/ ./api/

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]