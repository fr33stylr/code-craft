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


