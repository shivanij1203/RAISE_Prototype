ASSESSMENT_QUESTIONS = [
    # Behavioral questions - what do you actually do?
    {
        "id": "usage_frequency",
        "type": "behavioral",
        "question": "In the past 30 days, approximately how many times have you used AI tools (ChatGPT, Copilot, etc.) for work-related tasks?",
        "options": [
            {"value": 0, "label": "0 times"},
            {"value": 1, "label": "1-5 times"},
            {"value": 2, "label": "6-15 times"},
            {"value": 3, "label": "16-30 times"},
            {"value": 4, "label": "More than 30 times"}
        ],
        "category": "adoption"
    },
    {
        "id": "student_data",
        "type": "behavioral",
        "question": "Have you ever input student names, emails, or assignment submissions into an AI tool?",
        "options": [
            {"value": 0, "label": "Yes, regularly"},
            {"value": 1, "label": "Yes, a few times"},
            {"value": 2, "label": "No, but I wasn't aware this might be an issue"},
            {"value": 3, "label": "No, I specifically avoid this"}
        ],
        "category": "privacy",
        "scoring_note": "Higher = better awareness"
    },

    # Knowledge checks - do you actually know this?
    {
        "id": "ferpa_knowledge",
        "type": "knowledge",
        "question": "Under FERPA, which of the following student information can you legally paste into ChatGPT without student consent?",
        "options": [
            {"value": 0, "label": "Student emails and names", "correct": False},
            {"value": 1, "label": "Anonymized writing samples with no identifying info", "correct": True},
            {"value": 2, "label": "Grade information", "correct": False},
            {"value": 3, "label": "Student ID numbers", "correct": False}
        ],
        "category": "privacy",
        "explanation": "FERPA protects personally identifiable information. Only fully anonymized content can be shared with third-party AI tools."
    },
    {
        "id": "bias_detection",
        "type": "knowledge",
        "question": "A hiring AI trained on historical data recommends fewer women for technical roles. This is an example of:",
        "options": [
            {"value": 0, "label": "A bug in the algorithm", "correct": False},
            {"value": 1, "label": "Historical bias encoded in training data", "correct": True},
            {"value": 2, "label": "Accurate reflection of qualifications", "correct": False},
            {"value": 3, "label": "Random variation in outputs", "correct": False}
        ],
        "category": "bias",
        "explanation": "AI systems can perpetuate historical biases present in their training data, even without explicit discriminatory rules."
    },
    {
        "id": "hallucination_awareness",
        "type": "knowledge",
        "question": "ChatGPT confidently cites a research paper with author names, journal, and year. What should you assume?",
        "options": [
            {"value": 0, "label": "The citation is accurate since it includes specific details", "correct": False},
            {"value": 1, "label": "The paper exists but details might be wrong", "correct": False},
            {"value": 2, "label": "The entire citation could be fabricated and must be verified", "correct": True},
            {"value": 3, "label": "It's accurate if it's from a recent GPT model", "correct": False}
        ],
        "category": "accuracy",
        "explanation": "LLMs can generate plausible-sounding but completely fabricated citations. All AI-generated references must be independently verified."
    },

    # Scenario-based - what would you do?
    {
        "id": "scenario_grading",
        "type": "scenario",
        "question": "You're grading 50 essays and consider using AI to help. Which approach is most ethically sound?",
        "options": [
            {"value": 0, "label": "Paste essays into ChatGPT and use its grades directly"},
            {"value": 1, "label": "Use AI to identify patterns, but grade each essay yourself"},
            {"value": 2, "label": "Have AI grade, then spot-check a few"},
            {"value": 3, "label": "Don't tell students and use AI grades to save time"}
        ],
        "category": "transparency",
        "best_answer": 1,
        "explanation": "Using AI as a tool while maintaining human judgment and being transparent with students represents ethical AI use."
    },
    {
        "id": "scenario_detection",
        "type": "scenario",
        "question": "An AI detector flags a student's essay as '95% AI-generated.' The student denies using AI. What's the most appropriate response?",
        "options": [
            {"value": 0, "label": "The detector is highly accurate, so proceed with academic integrity violation"},
            {"value": 1, "label": "AI detectors have significant false positive rates; investigate further before any action"},
            {"value": 2, "label": "Assume the student is lying since the percentage is so high"},
            {"value": 3, "label": "Ignore the detection since AI detectors are unreliable"}
        ],
        "category": "accuracy",
        "best_answer": 1,
        "explanation": "AI detectors have documented false positive rates of 10-30%. High confidence scores don't guarantee accuracy. Further investigation is essential."
    },
    {
        "id": "scenario_policy",
        "type": "scenario",
        "question": "Your institution has no formal AI policy. A student asks if they can use ChatGPT on an assignment. What do you do?",
        "options": [
            {"value": 0, "label": "Say no to be safe"},
            {"value": 1, "label": "Say yes since there's no policy against it"},
            {"value": 2, "label": "Explain your expectations for this assignment and document them clearly"},
            {"value": 3, "label": "Tell them to figure it out themselves"}
        ],
        "category": "policy",
        "best_answer": 2,
        "explanation": "In absence of institutional policy, clear communication of expectations for each assignment is essential for fairness."
    },

    # Self-perception (for comparison with actual knowledge)
    {
        "id": "self_perception",
        "type": "self_report",
        "question": "How would you rate your understanding of AI ethics issues in education?",
        "options": [
            {"value": 1, "label": "Very limited"},
            {"value": 2, "label": "Basic understanding"},
            {"value": 3, "label": "Moderate understanding"},
            {"value": 4, "label": "Strong understanding"},
            {"value": 5, "label": "Expert level"}
        ],
        "category": "self_assessment"
    }
]

CATEGORIES = {
    "privacy": {
        "name": "Data Privacy & FERPA",
        "description": "Understanding of student data protection when using AI tools"
    },
    "bias": {
        "name": "AI Bias Recognition",
        "description": "Ability to identify and mitigate bias in AI systems"
    },
    "accuracy": {
        "name": "AI Limitations & Accuracy",
        "description": "Understanding of AI hallucinations, errors, and detection tool limitations"
    },
    "transparency": {
        "name": "Transparency & Attribution",
        "description": "Practices around disclosing AI use and maintaining academic integrity"
    },
    "policy": {
        "name": "Policy & Governance",
        "description": "Awareness of institutional policies and ethical frameworks"
    }
}

def get_questions():
    return ASSESSMENT_QUESTIONS

def get_categories():
    return CATEGORIES

def calculate_results(answers):
    results = {
        "knowledge_score": 0,
        "knowledge_total": 0,
        "scenario_score": 0,
        "scenario_total": 0,
        "self_perception": 0,
        "category_scores": {},
        "gaps": [],
        "strengths": []
    }

    for q in ASSESSMENT_QUESTIONS:
        qid = q["id"]
        if qid not in answers:
            continue

        answer = answers[qid]

        if q["type"] == "knowledge":
            results["knowledge_total"] += 1
            correct_option = next((o for o in q["options"] if o.get("correct")), None)
            if correct_option and answer == correct_option["value"]:
                results["knowledge_score"] += 1
            else:
                results["gaps"].append({
                    "category": q["category"],
                    "question": q["question"],
                    "explanation": q.get("explanation", "")
                })

        elif q["type"] == "scenario":
            results["scenario_total"] += 1
            if answer == q.get("best_answer"):
                results["scenario_score"] += 1
                results["strengths"].append(q["category"])
            else:
                results["gaps"].append({
                    "category": q["category"],
                    "question": q["question"],
                    "explanation": q.get("explanation", "")
                })

        elif q["type"] == "self_report":
            results["self_perception"] = answer

    # Calculate percentages
    if results["knowledge_total"] > 0:
        results["knowledge_percentage"] = round(
            (results["knowledge_score"] / results["knowledge_total"]) * 100
        )
    else:
        results["knowledge_percentage"] = 0

    if results["scenario_total"] > 0:
        results["scenario_percentage"] = round(
            (results["scenario_score"] / results["scenario_total"]) * 100
        )
    else:
        results["scenario_percentage"] = 0

    # Overall readiness
    total_correct = results["knowledge_score"] + results["scenario_score"]
    total_questions = results["knowledge_total"] + results["scenario_total"]

    if total_questions > 0:
        overall = (total_correct / total_questions) * 100
        if overall >= 80:
            results["readiness_level"] = "Well Prepared"
            results["readiness_color"] = "green"
        elif overall >= 60:
            results["readiness_level"] = "Moderate Gaps"
            results["readiness_color"] = "yellow"
        else:
            results["readiness_level"] = "Significant Training Needed"
            results["readiness_color"] = "red"
        results["overall_percentage"] = round(overall)

    # Compare self-perception to actual performance
    if results["self_perception"] >= 4 and results["overall_percentage"] < 60:
        results["perception_gap"] = "Your self-assessment suggests strong confidence, but knowledge checks indicate gaps. This is common - consider targeted training."
    elif results["self_perception"] <= 2 and results["overall_percentage"] >= 80:
        results["perception_gap"] = "You rated yourself lower than your actual knowledge demonstrates. You may be more prepared than you think."
    else:
        results["perception_gap"] = None

    return results
