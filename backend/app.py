from flask import Flask, request, jsonify, make_response
from utils.extractor import extract_text, extract_info
from utils.question_generator import generate_questions, generate_expected_answers
import os
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime, timedelta
import bcrypt
import jwt
import uuid
import traceback
from functools import wraps

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["https://frontend-5q11.onrender.com"], supports_credentials=True)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

JWT_SECRET = os.getenv("JWT_SECRET", "555")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION = 24  # hours

client = MongoClient("mongodb+srv://test20061004:bJVWovgn3uVv3VJb@cluster0.vhqnytc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
db = client["interview_app_db"]
users_collection = db["users"]
questions_collection = db["questions"]
user_answers_collection = db["user_answers"]

users_collection.create_index("email", unique=True)
users_collection.create_index("username", unique=True)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('token')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            current_user = users_collection.find_one({"_id": data['user_id']})
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400

    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not username or not email or not password:
        return jsonify({"message": "All fields are required"}), 400

    if users_collection.find_one({"email": email}):
        return jsonify({"message": "User with this email already exists"}), 409
    if users_collection.find_one({"username": username}):
        return jsonify({"message": "Username is already taken"}), 409

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    new_user = {
        "_id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    users_collection.insert_one(new_user)

    return jsonify({"message": "User registered successfully"}), 201

@app.route("/api/login", methods=["POST"])
def login():
    try:
        if users_collection is None:
            return jsonify({"message": "Database connection error"}), 500

        data = request.json
        if not data:
            return jsonify({"message": "No data provided"}), 400

        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not email or not password:
            return jsonify({"message": "Email and password are required"}), 400

        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"message": "Invalid email or password"}), 401

        print(f"Found user: {user['username']}")

        password_bytes = password.encode('utf-8')
        stored_password = user['password']
        print(f"Password type: {type(password_bytes)}, Stored password type: {type(stored_password)}")

        if isinstance(stored_password, str):
            stored_password = stored_password.encode('utf-8')

        try:
            password_match = bcrypt.checkpw(password_bytes, stored_password)
            print(f"Password match: {password_match}")

            if not password_match:
                return jsonify({"message": "Invalid email or password"}), 401
        except Exception as pwd_error:
            print(f"Password check error: {str(pwd_error)}")
            return jsonify({"message": f"Password verification error: {str(pwd_error)}"}), 500

        try:
            token_payload = {
                'user_id': user['_id'],
                'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION)
            }
            print(f"JWT payload: {token_payload}")

            token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            print(f"Generated token type: {type(token)}")
        except Exception as jwt_error:
            print(f"JWT generation error: {str(jwt_error)}")
            return jsonify({"message": f"Authentication token error: {str(jwt_error)}"}), 500

        response = make_response(jsonify({
            "message": "Login successful",
            "user": {
                "id": user['_id'],
                "username": user['username'],
                "email": user['email']
            }
        }))

        response.set_cookie(
            'token',
            token,
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=JWT_EXPIRATION * 3600
        )

        return response
    except Exception as e:
        print(f"Login error: {str(e)}")
        traceback.print_exc()
        return jsonify({"message": f"Server error: {str(e)}"}), 500

@app.route("/api/logout", methods=["POST"])
def logout():
    response = make_response(jsonify({"message": "Logout successful"}))
    response.delete_cookie('token')
    return response

@app.route("/api/profile", methods=["GET"])
@token_required
def get_profile(current_user):
    return jsonify({
        "id": current_user['_id'],
        "username": current_user['username'],
        "email": current_user['email'],
        "created_at": current_user['created_at']
    })

@app.route("/api/upload-resume", methods=["POST"])
@token_required
def upload_resume(current_user):
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    text = extract_text(file_path)
    info = extract_info(text)
    questions = generate_questions(skills=info["skills"], resume_text=text)
    
    # Generate expected answers for each question
    expected_answers = generate_expected_answers(questions, skills=info["skills"], resume_text=text)
    
    # Store questions and expected answers
    question_set_id = str(uuid.uuid4())
    questions_collection.insert_one({
        "_id": question_set_id,
        "user_id": current_user['_id'],
        "questions": questions,
        "expected_answers": expected_answers,
        "skills": info["skills"],
        "timestamp": datetime.utcnow()
    })

    return jsonify({
        "question_set_id": question_set_id,
        "questions": questions,
        "skills": info["skills"]
    })

@app.route("/api/upload-resume-public", methods=["POST"])
def upload_resume_public():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    text = extract_text(file_path)
    info = extract_info(text)
    questions = generate_questions(skills=info["skills"], resume_text=text)
    
    # Generate expected answers for each question
    expected_answers = generate_expected_answers(questions, skills=info["skills"], resume_text=text)
    
    # Store questions and expected answers
    question_set_id = str(uuid.uuid4())
    questions_collection.insert_one({
        "_id": question_set_id,
        "user_id": "public_user",
        "questions": questions,
        "expected_answers": expected_answers,
        "skills": info["skills"],
        "timestamp": datetime.utcnow()
    })

    return jsonify({
        "question_set_id": question_set_id,
        "questions": questions,
        "skills": info["skills"]
    })

@app.route("/api/process-voice", methods=["POST"])
@token_required
def process_voice(current_user):
    data = request.json
    transcription = data.get("transcription", "")

    if not transcription:
        return jsonify({"error": "No transcription provided"}), 400

    info = extract_info(transcription)
    questions = generate_questions(skills=info["skills"], resume_text=transcription)
    
    # Generate expected answers for each question
    expected_answers = generate_expected_answers(questions, skills=info["skills"], resume_text=transcription)
    
    # Store questions and expected answers
    question_set_id = str(uuid.uuid4())
    questions_collection.insert_one({
        "_id": question_set_id,
        "user_id": current_user['_id'],
        "questions": questions,
        "expected_answers": expected_answers,
        "skills": info["skills"],
        "timestamp": datetime.utcnow()
    })

    return jsonify({
        "question_set_id": question_set_id,
        "questions": questions,
        "skills": info["skills"]
    })

@app.route("/api/process-voice-public", methods=["POST"])
def process_voice_public():
    data = request.json
    transcription = data.get("transcription", "")

    if not transcription:
        return jsonify({"error": "No transcription provided"}), 400

    info = extract_info(transcription)
    questions = generate_questions(skills=info["skills"], resume_text=transcription)
    
    # Generate expected answers for each question
    expected_answers = generate_expected_answers(questions, skills=info["skills"], resume_text=transcription)
    
    # Store questions and expected answers
    question_set_id = str(uuid.uuid4())
    questions_collection.insert_one({
        "_id": question_set_id,
        "user_id": "public_user",
        "questions": questions,
        "expected_answers": expected_answers,
        "skills": info["skills"],
        "timestamp": datetime.utcnow()
    })

    return jsonify({
        "question_set_id": question_set_id,
        "questions": questions,
        "skills": info["skills"]
    })

@app.route("/api/question-history", methods=["GET"])
@token_required
def question_history(current_user):
    history = list(questions_collection.find(
        {"user_id": current_user['_id']},
        {"_id": 1, "user_id": 0, "questions": 1, "skills": 1, "timestamp": 1}
    ))
    history.sort(key=lambda x: x["timestamp"], reverse=True)
    
    # Convert ObjectId to string for JSON serialization
    for item in history:
        item["_id"] = str(item["_id"])
    
    return jsonify(history)

@app.route("/api/question-history-public", methods=["GET"])
def question_history_public():
    history = list(questions_collection.find(
        {},
        {"_id": 1, "questions": 1, "skills": 1, "timestamp": 1}
    ).sort("timestamp", -1).limit(20))
    
    # Convert ObjectId to string for JSON serialization
    for item in history:
        item["_id"] = str(item["_id"])
    
    return jsonify(history)

@app.route("/api/change-password", methods=["POST"])
@token_required
def change_password(current_user):
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400

    current_password = data.get('current_password', '').strip()
    new_password = data.get('new_password', '').strip()

    if not current_password or not new_password:
        return jsonify({"message": "Current and new passwords are required"}), 400

    if not bcrypt.checkpw(current_password.encode('utf-8'), current_user['password']):
        return jsonify({"message": "Current password is incorrect"}), 401

    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    users_collection.update_one(
        {"_id": current_user['_id']},
        {"$set": {"password": hashed_password}}
    )

    return jsonify({"message": "Password changed successfully"})

# New endpoints for the answer evaluation feature

@app.route("/api/submit-answer", methods=["POST"])
def submit_answer():
    try:
        data = request.json
        if not data:
            return jsonify({"message": "No data provided"}), 400
            
        question_set_id = data.get('question_set_id')
        question_index = data.get('question_index')
        user_answer = data.get('answer')
        
        if not question_set_id or question_index is None or not user_answer:
            return jsonify({"message": "Question set ID, question index and answer are required"}), 400
            
        # Get the question set from database
        question_set = questions_collection.find_one({"_id": question_set_id})
        if not question_set:
            return jsonify({"message": "Question set not found"}), 404
            
        if question_index >= len(question_set["questions"]):
            return jsonify({"message": "Question index out of range"}), 400
            
        # Get expected answer
        expected_answer = question_set["expected_answers"][question_index]
        
        # Get feedback instead of score
        from utils.answer_evaluator import compare_and_provide_feedback
        feedback = compare_and_provide_feedback(user_answer, expected_answer)
        
        # Store the user's answer and feedback
        user_id = request.cookies.get('token', 'anonymous_user')
        answer_id = str(uuid.uuid4())
        user_answers_collection.insert_one({
            "_id": answer_id,
            "user_id": user_id,
            "question_set_id": question_set_id,
            "question_index": question_index,
            "question": question_set["questions"][question_index],
            "user_answer": user_answer,
            "expected_answer": expected_answer,
            "feedback": feedback,
            "timestamp": datetime.utcnow()
        })
        
        return jsonify({
            "feedback": feedback,
            "expected_answer": expected_answer
        })
    except Exception as e:
        print(f"Error in submit_answer: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500
    
@app.route("/api/get-answers", methods=["GET"])
@token_required
def get_user_answers(current_user):
    question_set_id = request.args.get('question_set_id')
    if not question_set_id:
        return jsonify({"message": "Question set ID is required"}), 400
        
    # Get all answers for this question set by the current user
    answers = list(user_answers_collection.find(
        {"user_id": current_user['_id'], "question_set_id": question_set_id},
        {"_id": 0, "user_id": 0}
    ))
    
    # If old entries have match_percentage but no feedback, add a note
    for answer in answers:
        if "match_percentage" in answer and "feedback" not in answer:
            answer["feedback"] = "Detailed feedback not available for this answer."
            
    return jsonify(answers)

@app.route("/api/get-question-set/<question_set_id>", methods=["GET"])
def get_question_set(question_set_id):
    question_set = questions_collection.find_one({"_id": question_set_id})
    if not question_set:
        return jsonify({"message": "Question set not found"}), 404
        
    # Don't send expected answers to frontend
    question_set.pop("expected_answers", None)
    
    # Convert ObjectId to string for JSON serialization
    question_set["_id"] = str(question_set["_id"])
    
    return jsonify(question_set)

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({
        "error": str(e),
        "trace": traceback.format_exc()
    }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
