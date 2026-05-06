from crewai import Agent


def make_content_analyst(llm) -> Agent:
    return Agent(
        role="Textbook Content Analyst",
        goal=(
            "Analyze the provided textbook excerpts. "
            "Identify the key topics, subtopics, and important concepts. "
            "For each concept, assess whether it is suitable for an easy, medium, or hard question."
        ),
        backstory=(
            "You are an experienced curriculum specialist who reads textbook content "
            "and maps it into clearly organized topics and difficulty levels."
        ),
        llm=llm,
        verbose=False,
    )
