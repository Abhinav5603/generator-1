import fitz  # PyMuPDF
import docx
import spacy
from openai import OpenAI
import os
import re

# Set the API key directly
os.environ["TOGETHER_API_KEY"] = "6f70706e611fa0b4510b85c6e89830a7e0063795f56b88670707282a83a1eea0"

# Initialize the OpenAI client - use the API key directly
client = OpenAI(
    base_url="https://api.together.xyz/v1",
    api_key="6f70706e611fa0b4510b85c6e89830a7e0063795f56b88670707282a83a1eea0"  # Set key directly
)

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except:
    import spacy.cli
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def extract_text(file_path):
    """Extract text from PDF or DOCX files"""
    if file_path.endswith(".pdf"):
        doc = fitz.open(file_path)
        return " ".join(page.get_text() for page in doc)
    elif file_path.endswith(".docx"):
        doc = docx.Document(file_path)
        return " ".join([p.text for p in doc.paragraphs])
    else:
        return ""

def extract_skills_with_llm(text):
    """Use Together AI to extract skills from resume text"""
    response = client.chat.completions.create(
        model="mistralai/Mixtral-8x7B-Instruct-v0.1",
        messages=[
            {"role": "system", "content": "You are an expert at parsing resumes and identifying technical and soft skills."},
            {"role": "user", "content": f"Extract all technical skills, programming languages, frameworks, tools, and soft skills from this resume text. Return ONLY a comma-separated list of skills with no additional text or explanations.\n\nResume text:\n{text[:4000]}"}  # Limiting text length
        ],
        temperature=0.3,
        max_tokens=200
    )
    
    skills_text = response.choices[0].message.content.strip()
    # Clean up the response
    skills_text = re.sub(r'Skills:|Technical Skills:|Soft Skills:', '', skills_text)
    skills_text = re.sub(r'[\n\r]', ', ', skills_text)
    skills = [skill.strip() for skill in skills_text.split(',') if skill.strip()]
    
    return list(set(skills))  # Remove duplicates

def extract_info(text):
    """Extract information from resume text"""
    # First use spaCy to try to extract some entities
    doc = nlp(text[:100000])  # Limit text size to prevent processing errors
    spacy_skills = [ent.text for ent in doc.ents if ent.label_ in ["ORG", "PRODUCT"]]
    
    # Then use LLM to extract skills
    llm_skills = extract_skills_with_llm(text)
    
    # Combine both skill sets
    all_skills = list(set(spacy_skills + llm_skills))
    
    return {
        "skills": all_skills,
        "raw_text": text
    }