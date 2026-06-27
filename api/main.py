import os
from contextlib import asynccontextmanager

import spacy
import weaviate
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .deps import get_embedder, get_generator, get_nlp, get_session, get_weaviate
from .m8_rag import load_generator
from .nlp import extract_entities
from .kg import wrap_kg_query
from .w9b_mapper.errors import UnsupportedQueryError
from .rag import compose_rag
from .models import (
    Entity,
    ExtractRequest,
    ExtractResponse,
    HealthResponse,
    KGRequest,
    KGResponse,
    RAGRequest,
    RAGResponse,
    ReadyDetail,
    UnsupportedQueryDetail,
)

ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    neo4j_uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.environ.get("NEO4J_USER", "neo4j")
    neo4j_password = os.environ.get("NEO4J_PASSWORD", "password")
    
    try:
        app.state.neo4j_driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
    except Exception as e:
        print(f"Warning: Neo4j connection failed: {e}. Continuing without Neo4j.")
        app.state.neo4j_driver = None

    weaviate_url = os.environ.get("WEAVIATE_URL", "http://localhost:8080")
    try:
        app.state.weaviate_client = weaviate.Client(url=weaviate_url, startup_period=1)
    except Exception as e:
        print(f"Warning: Weaviate connection failed: {e}. Continuing without Weaviate.")
        app.state.weaviate_client = None

    try:
        app.state.nlp = spacy.load("en_core_web_sm")
    except Exception as e:
        print(f"Warning: spaCy model load failed: {e}. Continuing without spaCy.")
        app.state.nlp = None

    try:
        app.state.generator = load_generator()
    except Exception as e:
        print(f"Warning: Generator load failed: {e}. Continuing without generator.")
        app.state.generator = None

    try:
        app.state.embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    except Exception as e:
        print(f"Warning: Embedder load failed: {e}. Continuing without embedder.")
        app.state.embedder = None

    yield
    
    if app.state.neo4j_driver:
        app.state.neo4j_driver.close()

app = FastAPI(title="M10 Recipe Service", lifespan=lifespan)

WEB_ORIGIN = os.environ.get("WEB_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[WEB_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/extract", response_model=ExtractResponse)
def extract(req: ExtractRequest, nlp=Depends(get_nlp)):
    entities = extract_entities(req.text, nlp)
    return ExtractResponse(entities=entities)

@app.post("/kg/query", response_model=KGResponse)
def kg_query(req: KGRequest, session=Depends(get_session)):
    try:
        cypher, params = wrap_kg_query(req.question)
    except UnsupportedQueryError as e:
     detail = UnsupportedQueryDetail(
        reason="unsupported_question",
        supported_patterns=["(?i)recipe for (?P<recipe>.+)", "(?i)how to make (?P<recipe>.+)", "(?i)what is in (?P<recipe>.+)"]
      )
     raise HTTPException(status_code=422, detail=detail.model_dump())
    result = session.run(cypher, parameters=params)
    rows = [record.data() for record in result]
    
    return KGResponse(cypher=cypher, rows=rows, count=len(rows))

@app.post("/rag/answer", response_model=RAGResponse)
def rag_answer(req: RAGRequest, weaviate_client=Depends(get_weaviate), generator=Depends(get_generator), embedder=Depends(get_embedder)):
    result = compose_rag(
        question=req.question,
        embedder=embedder,
        weaviate_client=weaviate_client,
        generator=generator,
        k=req.k
    )
    return RAGResponse(**result)

@app.get("/healthz", response_model=HealthResponse)
def healthz():
    return HealthResponse(status="ok")

@app.get("/readyz", response_model=ReadyDetail)
def readyz(session=Depends(get_session), weaviate_client=Depends(get_weaviate)):
    neo4j_status = "ok"
    weaviate_status = "ok"
    
    try:
        session.run("RETURN 1 AS ok")
    except Exception:
        neo4j_status = "down"
        
    try:
        if not weaviate_client.is_ready():
            weaviate_status = "down"
    except Exception:
        weaviate_status = "down"
        
    detail = ReadyDetail(neo4j=neo4j_status, weaviate=weaviate_status)
    
    if neo4j_status == "down" or weaviate_status == "down":
        raise HTTPException(status_code=503, detail=detail.model_dump())
        
    return detail