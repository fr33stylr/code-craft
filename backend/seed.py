from database import SessionLocal
import models

def seed_database():
    db=SessionLocal()

    try:
        project_count=db.query(models.Project).count()
        if project_count>0:
            print("Database already contains project data.skipping seeding.")
            return
        
        print("Seeding database with initial project data...")

        initial_projects=[
            models.Project(
                title="Build a URL Shortener",
                description="Master routing and database indexing by crafting an API that converts long links into short, shareable redirections.",
                difficulty="Beginner"
            ),
            models.Project(
                title="Real-time Chat App",
                description="Learn the power of WebSockets, concurrent message dispatching, and state management by crafting a multiroom chat app.",
                difficulty="Intermediate"
            ),
            models.Project(
                title="AI Support Agent",
                description="Implement structured streaming prompts, vector similarity search, and context injection using LLMs.",
                difficulty="Advanced"
            )
        ]

        db.add_all(initial_projects)
        db.commit()
        print("Database seeding completed successfully.")

    except Exception as e:
        print(f"An error occurred during database seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__=="__main__":
    seed_database()