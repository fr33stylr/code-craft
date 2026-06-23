from fastapi import FastAPI,Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db
import models
import schemas
from ai_service import call_groq_tutor, generate_project_roadmap
import json

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "[http://127.0.0.1:5173](http://127.0.0.1:5173)"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "CodeCraft engine is live!"}

@app.get("/api/projects")
def get_all_projects(db:Session=Depends(get_db)):
    projects=db.query(models.Project).all()
    return projects
@app.get("/api/test-ai")
async def test_ai_route(prompt: str = "Explain how database migrations work in 3 sentences without using code."):
    response = await call_groq_tutor(prompt)
    return {"reply": response}
@app.post("/api/project/setup")
async def project_setup(request:schemas.ProjectSetupRequest):
    raw_json_string = await generate_project_roadmap(request.project_idea, request.preferred_stack)
    roadmap_data = json.loads(raw_json_string)
    return roadmap_data