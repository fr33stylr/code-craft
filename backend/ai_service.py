import os
import asyncio
from groq import AsyncGroq
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

client=AsyncGroq(api_key=api_key)

SYSTEM_PROMPT = """
You are "CodeCraft Guide", an expert programming tutor. Your goal is to help developers build real projects step-by-step.
Follow these strict rules:
1. NEVER output a complete, fully functioning file of code. 
2. Break concepts down into conversational micro-steps.
3. Explain the "WHY" before showing code, then explain each line of the code chunk.
4. Maximum 3-5 lines per code chunk. 
5. If the user makes a mistake, point out the logical error and give a hint, rather than giving the corrected line immediately.
6. Keep your tone encouraging, technical, and gamified (using analogies of forging, crafting, and leveling up).
"""

async def call_groq_tutor(user_message: str,system_prompt:str=SYSTEM_PROMPT)-> str:
    """
    Sends a query to Llama-3.3 on Groq with robust error handling.
    Includes an exponential retry backoff in case of rate limits or server blips.
    """
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in environment variables.")
    
    delays =[1, 2, 4, 8, 16]  # Exponential backoff delays in seconds

    for attempt, delay in enumerate(delays):
        try:
            response=await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.3,
                max_tokens=1024
            )

            if response.choices and response.choices[0].message:
                return response.choices[0].message.content
            raise ValueError("No valid response from Groq API.")
        except Exception as e:
            if attempt<len(delays)-1:
                await asyncio.sleep(delay)
                continue

            raise HTTPException(
                status_code=503,
                detail=f"The CodeCraft guide is temporarily resting.Details: {str(e)}"
            )
    raise HTTPException(status_code=500, detail="Unexpected failure talking to the Groq AI service.")

async def generate_project_roadmap(idea:str,stack:str)->str:
    """
    Call 1: Takes a project idea and stack, and returns a JSON roadmap.
    """
    setup_prompt = f"""
    You are an expert software architect. The user wants to build: {idea}.
    Their preferred stack is: {stack}.
    
    Break this project down into exactly 5 logical levels.
    Respond ONLY in valid JSON format with this exact structure:
    {{
      "project_type": "...",
      "tech_stack": "...",
      "total_levels": 5,
      "level_goals": [
        "Level 1: ...",
        "Level 2: ...",
        "Level 3: ...",
        "Level 4: ...",
        "Level 5: ..."
      ]
    }}
    """
    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": setup_prompt}],
            temperature=0.2, # Very low temperature for structured JSON output
            response_format={"type": "json_object"} # Forces Groq to return pure JSON
        )
        return response.choices[0].message.content
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to generate roadmap: {str(e)}")

async def run_level_start_tutor(context: dict) -> str:
    """
    Call 2: Explains the concepts of the current level to the user.
    Strictly forbids any code blocks.
    """
    start_prompt = f"""
    You are "CodeCraft Guide", an expert programming tutor.
    The student is building: "{context['project_type']}" using {context['tech_stack']}.
    They are starting Level {context['current_level']} of {context['total_levels']}.
    
    Level Goals:
    {chr(10).join(context['level_goals'])}
    
    Your task:
    1. Explain the theory and architectural concepts behind this level's goals.
    2. Do NOT write any code snippets or code blocks.
    3. Keep your explanation brief, highly engaging, and focus on the "WHY".
    4. End with an encouraging prompt asking the user if they are ready to write the first lines of code.
    """
    
    return await call_groq_tutor(
        user_message=f"I am starting Level {context['current_level']}. Explain the concepts to me.",
        system_prompt=start_prompt
    )


async def run_level_step_tutor(context: dict) -> str:
    """
    Call 3: Outputs the next micro-step code chunk (3-5 lines max) with line-by-line explanation.
    Forces output into a structured JSON with an "instruction" key.
    """
    step_prompt = f"""
    You are "CodeCraft Guide", an expert programming tutor.
    The student is building: "{context['project_type']}" using {context['tech_stack']}.
    They are on Level {context['current_level']} of {context['total_levels']}.
    
    Level Goals:
    {chr(10).join(context['level_goals'])}
    
    Current Code State:
    {context['code_summary']}
    
    Decisions Made:
    {', '.join(context['decisions_made'])}
    
    Your task:
    1. Identify the absolute next micro-step the user needs to write to make progress.
    2. Explain the "WHY" behind this micro-step.
    3. Output a single code block showing ONLY the next 3 to 5 lines of code.
    4. Explain what each line in the code block does.
    5. You MUST respond strictly in JSON format with this exact key:
       {{
         "instruction": "your explanation, the code block in markdown, and the line-by-line breakdown"
       }}
    """
    
    try:
        # Standard, safe array for passing the system prompt
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": step_prompt},
                {"role": "user", "content": "Give me the next step in JSON format."}
            ],
            temperature=0.3,
            response_format={"type": "json_object"} 
        )
        return response.choices[0].message.content
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to generate teaching step: {str(e)}")

async def run_workspace_chat_tutor(context: dict, user_question: str) -> str:
    """
    Call 4: Handles custom user questions, doubts, and debugging logs.
    Takes the recent conversation history, code state, and guides the user.
    """
    # 1. Format the conversation history into a readable log for the AI
    history_log = ""
    for msg in context.get("conversation_history", []):
        role = "Student" if msg.get("role") == "user" else "Guide"
        history_log += f"{role}: {msg.get('content')}\n"
    
    chat_prompt = f"""
    You are "CodeCraft Guide", an expert programming tutor.
    The student is building: "{context['project_type']}" using {context['tech_stack']}.
    They are currently on Level {context['current_level']} of {context['total_levels']}.
    
    Level Goals:
    {chr(10).join(context['level_goals'])}
    
    Code state so far:
    {context['code_summary']}
    
    Decisions made:
    {', '.join(context['decisions_made'])}
    
    Recent Chat History:
    {history_log}
    
    Student's Current Question/Issue:
    "{user_question}"
    
    Your task:
    1. Answer the student's question directly, accurately, and conceptually.
    2. If they are reporting an error, point out the logical bug and provide a hint. DO NOT give them the direct copy-paste code correction immediately.
    3. Keep your response relevant ONLY to their current level goals and code state.
    4. Keep any code snippets to a strict 3-5 line maximum.
    """
    
    return await call_groq_tutor(
        user_message=user_question,
        system_prompt=chat_prompt
    )