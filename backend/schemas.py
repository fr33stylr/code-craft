from pydantic import BaseModel
from typing import List, Optional, Dict

class ProjectSetupRequest(BaseModel):
    project_idea:str
    preferred_stack: Optional[str]="React, Tailwind CSS, Zustand, Tiptap"

class ContextObject(BaseModel):
    project_type: str
    tech_stack:str
    current_level:int
    total_levels:int
    level_goals: List[str]
    code_summary: str
    decisions_made: List[str]
    conversation_history: List[Dict[str,str]]

class WorkspaceChatRequest(BaseModel):
    context: ContextObject
    user_question: str