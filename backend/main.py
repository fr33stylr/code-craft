from fastapi import FastAPI,Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db
import models
import schemas
from ai_service import call_groq_tutor, generate_project_roadmap, run_level_start_tutor, run_level_step_tutor,run_workspace_chat_tutor
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
# NEW: Call 2 - Level Start Endpoint
@app.post("/api/level/start")
async def level_start(context: schemas.ContextObject):
    context_dict = context.dict()
    explanation = await run_level_start_tutor(context_dict)
    return {"explanation": explanation}


# NEW: Call 3 - Teaching Step Endpoint
@app.post("/api/level/step")
async def level_step(context: schemas.ContextObject):
    context_dict = context.dict()
    raw_json_string = await run_level_step_tutor(context_dict)
    
    try:
        # Parse the string returned by Groq into an actual dictionary
        step_data = json.loads(raw_json_string)
        return step_data
    except json.JSONDecodeError:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="AI did not return valid JSON. Please try again.")
    
@app.post("/api/level/chat")
async def level_chat(request:schemas.WorkspaceChatRequest):
    context_dict=request.context.dict()
    reply=await run_workspace_chat_tutor(context_dict,request.user_question)
    return {"reply":reply}