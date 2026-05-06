from crewai import Agent


def make_paper_formatter(llm) -> Agent:
    return Agent(
        role="Paper Structuring Agent",
        goal=(
            "Organize the reviewed questions into a structured question paper. "
            "Group questions by type into clearly labeled sections. "
            "Assign the correct marks to each question. "
            "Output valid JSON in exactly this format:\n"
            "{\n"
            '  "sections": [\n'
            "    {\n"
            '      "title": "Section A: Multiple Choice Questions",\n'
            '      "instructions": "Choose the correct answer.",\n'
            '      "questions": [\n'
            "        {\n"
            '          "number": 1,\n'
            '          "text": "...",\n'
            '          "options": ["A. ...", "B. ...", "C. ...", "D. ..."],\n'
            '          "answer": "A",\n'
            '          "marks": 1\n'
            "        }\n"
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}\n"
            "For non-MCQ questions, omit the options field. "
            "For non-MCQ questions, the answer field contains the model answer text."
        ),
        backstory=(
            "You are a professional exam paper typesetter who arranges questions "
            "into a clean, well-structured format ready for printing."
        ),
        llm=llm,
        verbose=False,
    )
