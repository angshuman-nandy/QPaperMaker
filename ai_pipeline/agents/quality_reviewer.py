from crewai import Agent


def make_quality_reviewer(llm) -> Agent:
    return Agent(
        role="Academic Quality Reviewer",
        goal=(
            "Review the drafted questions. Check each one for: "
            "(1) factual accuracy based on the source content, "
            "(2) clarity — no ambiguous wording, "
            "(3) appropriate difficulty level, "
            "(4) no duplicate questions. "
            "Fix any issues and return the corrected, complete list of questions."
        ),
        backstory=(
            "You are a meticulous academic reviewer who ensures every question "
            "in an exam is fair, accurate, and clearly written."
        ),
        llm=llm,
        verbose=False,
    )
