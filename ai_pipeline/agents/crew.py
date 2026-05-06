# MIT License
# Copyright (c) 2026 Angshuman Nandy

import os
import json
from crewai import Crew, Task, LLM

from agents.content_analyst import make_content_analyst
from agents.question_designer import make_question_designer
from agents.paper_formatter import make_paper_formatter

llm = LLM(model="gpt-4o", api_key=os.environ["OPENAI_API_KEY"])
llm_mini = LLM(model="gpt-4o-mini", api_key=os.environ["OPENAI_API_KEY"])


def build_question_type_description(question_types: dict) -> str:
    lines = []
    for qtype, config in question_types.items():
        if config.get("enabled"):
            name = qtype.replace("_", " ").title()
            lines.append(f"- {name}: {config['count']} questions, {config['marks_each']} mark(s) each")
    return "\n".join(lines)


def run_paper_generation(
    title: str,
    content_chunks: list[str],
    params: dict,
) -> dict:
    """Run the 3-agent CrewAI pipeline and return the structured paper as a dict."""

    content_text = "\n\n---\n\n".join(content_chunks)
    difficulty = params.get("difficulty", {})
    question_desc = build_question_type_description(params.get("question_types", {}))
    topic_focus = ", ".join(params.get("topic_focus", [])) or "all topics in the content"

    analyst = make_content_analyst(llm_mini)
    designer = make_question_designer(llm)
    formatter = make_paper_formatter(llm_mini)

    task_analyze = Task(
        description=(
            f"Analyze the following textbook content and identify key topics and concepts.\n\n"
            f"Focus on: {topic_focus}\n\n"
            f"Content:\n{content_text}"
        ),
        expected_output="A topic map listing topics, subtopics, and difficulty-tagged concepts.",
        agent=analyst,
    )

    task_design = Task(
        description=(
            f"Using the topic map, write questions for the paper titled '{title}'.\n\n"
            f"Required question types:\n{question_desc}\n\n"
            f"Difficulty mix: {difficulty.get('easy_pct', 30)}% easy, "
            f"{difficulty.get('medium_pct', 50)}% medium, "
            f"{difficulty.get('hard_pct', 20)}% hard."
        ),
        expected_output="A complete list of drafted questions organized by type.",
        agent=designer,
    )

    task_format = Task(
        description=(
            f"Organize the questions into a structured JSON question paper. "
            f"Paper title: '{title}'. "
            f"Total marks: {params.get('total_marks')}. "
            f"Time allowed: {params.get('time_minutes')} minutes."
        ),
        expected_output="Valid JSON representing the complete structured question paper.",
        agent=formatter,
    )

    crew = Crew(
        agents=[analyst, designer, formatter],
        tasks=[task_analyze, task_design, task_format],
        verbose=False,
    )

    result = crew.kickoff()

    raw = str(result)
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])
