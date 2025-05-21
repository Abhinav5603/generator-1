import os
from openai import OpenAI
import re

# Set the API key directly
api_key = "6f70706e611fa0b4510b85c6e89830a7e0063795f56b88670707282a83a1eea0"
os.environ["TOGETHER_API_KEY"] = api_key

# Create client instance
client = OpenAI(
    base_url="https://api.together.xyz/v1",
    api_key=api_key
)

def extract_skills_from_resume(resume_text):
    """Extract only explicitly mentioned skills from resume"""
    # This is a very direct prompt to extract only skills explicitly listed
    prompt = f"""
    The resume below has a "Skills" section.
    Extract ONLY the technical skills explicitly listed in the Skills section.
    Return just the skills as a comma-separated list with no additional text or explanation.
    
    Resume:
    {resume_text}
    """
    
    response = client.chat.completions.create(
        model="mistralai/Mixtral-8x7B-Instruct-v0.1",
        messages=[
            {"role": "system", "content": "You are a resume parser that extracts only explicitly mentioned skills."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=50
    )
    
    skills_text = response.choices[0].message.content.strip()
    # Remove any explanatory text that might have been included
    if ":" in skills_text:
        skills_text = skills_text.split(":", 1)[1]
    
    # Clean up and split
    skills = [skill.strip() for skill in skills_text.split(',') if skill.strip()]
    
    # If no skills found or the model returned something else, 
    # do a direct pattern match for skills section
    if not skills:
        skills_match = re.search(r'Skills\s*[:-]\s*(.*?)(?=\w+\s*[:|\n]|$)', resume_text, re.IGNORECASE | re.DOTALL)
        if skills_match:
            skills_text = skills_match.group(1).strip()
            # Split by common delimiters
            skills = re.split(r'[,|•|-]', skills_text)
            skills = [skill.strip() for skill in skills if skill.strip()]
    
    # Manually look for Python if it's mentioned anywhere
    if 'python' not in [s.lower() for s in skills] and 'python' in resume_text.lower():
        skills.append('Python')
    
    return skills

def generate_questions(skills=None, resume_text=None):
    """Generate technical interview questions based on specified skills and resume context"""
    if resume_text and not skills:
        skills = extract_skills_from_resume(resume_text)
    
    if not skills or len(skills) == 0:
        return ["No specific skills were identified. Please check the resume format."]
    
    # Extract experience sections from resume
    experience_text = extract_experience(resume_text)
    
    # Create a more detailed prompt
    prompt = f"""
    You are an expert technical interviewer. Generate interview questions based on the following resume:
    
    Skills: {', '.join(skills)}
    Experience: {experience_text}
    
    Generate 10-15 questions that:
    1. Test practical knowledge of the listed skills
    2. Are relevant to the candidate's experience
    3. Include both technical and behavioral aspects
    4. Are at an appropriate difficulty level
    5. Cover different aspects of their experience
    
    Format each question as a complete sentence.
    """
    
    response = client.chat.completions.create(
        model="mistralai/Mixtral-8x7B-Instruct-v0.1",
        messages=[
            {"role": "system", "content": "You are an expert technical interviewer. Generate relevant interview questions based on candidate's skills and experience."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=500
    )
    
    questions = response.choices[0].message.content.strip().split('\n')
    questions = [q.strip() for q in questions if q.strip()]
    
    # Verify each question mentions at least one skill or is relevant to experience
    verified_questions = []
    skills_lower = [s.lower() for s in skills]
    
    for q in questions:
        is_relevant = any(skill.lower() in q.lower() for skill in skills) or \
                     any(exp.lower() in q.lower() for exp in experience_text.split())
        if is_relevant:
            verified_questions.append(q)
    
    # If we didn't get enough verified questions, try to generate more
    if len(verified_questions) < 5:
        # Generate additional questions focusing on different aspects
        additional_prompts = [
            f"Create 5 scenario-based questions for someone with experience in {', '.join(skills[:3])}",
            f"Generate 5 coding interview questions related to {skills[0] if skills else 'general programming'}",
            "Create 5 behavioral questions based on the candidate's experience"
        ]
        
        for prompt in additional_prompts:
            response = client.chat.completions.create(
                model="mistralai/Mixtral-8x7B-Instruct-v0.1",
                messages=[
                    {"role": "system", "content": "You are an expert technical interviewer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            new_questions = response.choices[0].message.content.strip().split('\n')
            new_questions = [q.strip() for q in new_questions if q.strip()]
            verified_questions.extend(new_questions)
            
            if len(verified_questions) >= 10:  # Stop once we have enough questions
                break
    
    # Remove duplicates and return the final list
    return list(dict.fromkeys(verified_questions))[:15]  # Limit to 15 questions

def generate_expected_answers(questions, skills=None, resume_text=None):
    """Generate expected answers for each interview question"""
    if not questions:
        return []
        
    # Extract experience for context
    experience_text = extract_experience(resume_text) if resume_text else ""
    skills_text = ", ".join(skills) if skills else ""
    
    expected_answers = []
    
    for question in questions:
        prompt = f"""
        You are an expert interviewer evaluating responses to technical interview questions.
        
        Question: {question}
        
        Candidate Skills: {skills_text}
        Candidate Experience: {experience_text}
        
        Generate an ideal answer to this question that would receive a perfect score.
        The answer should be comprehensive but concise (150-250 words).
        Include specific technical details where appropriate.
        
        Ideal Answer:
        """
        
        response = client.chat.completions.create(
            model="mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages=[
                {"role": "system", "content": "You are an expert technical interviewer creating model answers for evaluation."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )
        
        answer = response.choices[0].message.content.strip()
        expected_answers.append(answer)
    
    return expected_answers

def extract_experience(resume_text):
    """Extract relevant experience sections from the resume"""
    experience_sections = []
    
    # Look for common experience section headers
    experience_headers = ['experience', 'work experience', 'professional experience',
                         'employment history', 'career history']
    
    for header in experience_headers:
        pattern = rf'(?i){header}\s*[:-]\s*(.*?)(?=\w+\s*[:|\n]|$)'
        matches = re.finditer(pattern, resume_text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            experience_sections.append(match.group(1).strip())
    
    # If no experience sections found, try to extract job titles and companies
    if not experience_sections:
        pattern = r'\b(?:[A-Z][a-z]+\s*){2,}(?:at|in|for|with)\s+(?:[A-Z][a-z]+\s*){2,}\b'
        matches = re.finditer(pattern, resume_text)
        for match in matches:
            experience_sections.append(match.group(0))
    
    return '\n'.join(experience_sections)

def extract_info(text):
    """Extract information from resume text"""
    skills = extract_skills_from_resume(text)
    return {
        "skills": skills,
        "raw_text": text
    }