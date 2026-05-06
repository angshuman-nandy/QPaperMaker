# MIT License
# Copyright (c) 2026 Angshuman Nandy

from crewai import Agent


def make_question_designer(llm) -> Agent:
    return Agent(
        role="Question Paper Designer",
        goal=(
            "Using the topic map from the Content Analyst, write the requested number "
            "of questions for each enabled question type (MCQ, True/False, Fill in the Blanks, "
            "Short Answer, Long Answer). Match the difficulty distribution specified. "
            "For MCQs, always provide four options labeled A–D with one correct answer marked."
        ),
        backstory=(
            "You are a seasoned teacher and question writer who crafts clear, "
            "unambiguous exam questions that test genuine understanding of the subject."
        ),
        llm=llm,
        verbose=False,
    )
