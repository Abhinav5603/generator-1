from openai import OpenAI
import os
import re
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import nltk

# Initialize NLTK resources
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

# Set the API key directly
api_key = "6f70706e611fa0b4510b85c6e89830a7e0063795f56b88670707282a83a1eea0"
os.environ["TOGETHER_API_KEY"] = api_key

# Create client instance
client = OpenAI(
    base_url="https://api.together.xyz/v1",
    api_key=api_key
)

def preprocess_text(text):
    """Basic text preprocessing"""
    # Convert to lowercase
    text = text.lower()
    
    # Remove special characters and numbers
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\d+', ' ', text)
    
    # Tokenize
    tokens = word_tokenize(text)
    
    # Remove stopwords
    stop_words = set(stopwords.words('english'))
    tokens = [word for word in tokens if word not in stop_words]
    
    # Join tokens back into a string
    return ' '.join(tokens)

def extract_keywords(text):
    """Extract important technical concepts from text"""
    try:
        # Use LLM to extract key technical concepts
        prompt = f"""
        Extract the 5-8 most important technical concepts or key points from this text that would be essential for a correct answer:
        
        {text}
        
        Return only the key technical concepts as a comma-separated list, with no additional text.
        """
        
        response = client.chat.completions.create(
            model="mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages=[
                {"role": "system", "content": "You extract essential technical concepts from text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=100
        )
        
        keywords_text = response.choices[0].message.content.strip()
        
        # Clean and split keywords
        keywords = [kw.strip() for kw in keywords_text.split(',') if kw.strip()]
        return keywords
    except Exception as e:
        print(f"Error extracting keywords: {str(e)}")
        
        # Fallback to simple frequency-based extraction
        words = preprocess_text(text).split()
        word_freq = {}
        for word in words:
            if len(word) > 3:  # Only consider words longer than 3 chars
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency and return top 5
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_words[:5]]

def compare_and_provide_feedback(user_answer, expected_answer):
    """Directly compare user answer with expected answer and provide feedback without scoring"""
    try:
        prompt = f"""
        You are a helpful technical interview coach providing detailed feedback.
        
        Expected Answer:
        {expected_answer}
        
        User's Answer:
        {user_answer}
        
        Provide comprehensive feedback on the user's answer by:
        1. Analyzing how well the answer covers key technical concepts from the expected answer
        2. Identifying which important points were covered well
        3. Noting which important elements might be missing or could be improved
        4. Providing specific suggestions to enhance the technical accuracy
        
        Be thorough but constructive. DO NOT include any numerical scores or ratings in your feedback.
        Format your response as helpful coaching rather than as an evaluation.
        """
        
        response = client.chat.completions.create(
            model="mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages=[
                {"role": "system", "content": "You are a technical interview coach providing helpful feedback without numerical scoring."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=350
        )
        
        feedback = response.choices[0].message.content.strip()
        return feedback
    except Exception as e:
        print(f"Error generating feedback: {str(e)}")
        
        # Fallback feedback without scoring info
        # Extract keywords to determine key missing concepts
        expected_keywords = extract_keywords(expected_answer)
        user_text = user_answer.lower()
        
        missing_keywords = [keyword for keyword in expected_keywords if keyword.lower() not in user_text]
        
        if not missing_keywords:
            return "Your answer covers the relevant technical concepts. Consider elaborating further with specific examples and more precise technical terminology to strengthen your response."
        else:
            missing_concepts = ", ".join(missing_keywords[:3])  # Limit to 3 to avoid overwhelming
            return f"Your answer could be strengthened by addressing these key concepts: {missing_concepts}. Consider reviewing these areas and incorporating them into your explanation for a more comprehensive response."

# Example usage
if __name__ == "__main__":
    user_answer = "Your test answer here"
    expected_answer = "The expected correct answer here"
    
    feedback = compare_and_provide_feedback(user_answer, expected_answer)
    print("\nFeedback:")
    print(feedback)