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
import atexit
import signal
import sys
from functools import wraps

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["*"], supports_credentials=True)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

JWT_SECRET = os.getenv("JWT_SECRET", "555")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION = 24  # hours

# MongoDB connection with SSL configuration for Render deployment
try:
    client = MongoClient(
        "mongodb+srv://abhinav:abhinav56@projectquestions.xcmjkfj.mongodb.net/?retryWrites=true&w=majority&appName=projectquestions",
        serverSelectionTimeoutMS=10000,  # 10 second timeout
        connectTimeoutMS=20000,  # 20 second connection timeout
        socketTimeoutMS=20000,   # 20 second socket timeout
        maxPoolSize=10,          # Limit connection pool size
        minPoolSize=1,           # Minimum pool size
        maxIdleTimeMS=30000,     # Close connections after 30s idle
        # SSL/TLS configuration for better compatibility
        ssl=True,
        ssl_cert_reqs='CERT_NONE',  # More lenient SSL for deployment issues
        tlsAllowInvalidCertificates=True,  # Allow invalid certs for now
        tlsAllowInvalidHostnames=True      # Allow invalid hostnames for now
    )
    
    # Test the connection
    client.admin.command('ping')
    print("MongoDB connection successful")
    
    db = client["interview_app_db"]
    users_collection = db["users"]
    questions_collection = db["questions"]
    user_answers_collection = db["user_answers"]
    
    # Create indexes with error handling
    try:
        users_collection.create_index("email", unique=True)
        users_collection.create_index("username", unique=True)
        print("Database indexes created successfully")
    except Exception as e:
        print(f"Index creation warning (continuing anyway): {e}")

except Exception as e:
    print(f"MongoDB connection failed: {e}")
    print("Application will continue but database operations will fail")
    client = None
    db = None
    users_collection = None
    questions_collection = None
    user_answers_collection = None

def cleanup_resources():
    """Clean up database connections on shutdown"""
    try:
        if client:
            print("Cleaning up database connections...")
            client.close()
            print("Database connections closed successfully")
    except Exception as e:
        print(f"Error during cleanup: {e}")

def signal_handler(sig, frame):
    """Handle shutdown signals gracefully"""
    print(f"\nReceived signal {sig}, shutting down gracefully...")
    cleanup_resources()
    sys.exit(0)

# Register cleanup functions
atexit.register(cleanup_resources)
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not users_collection:
            return jsonify({'message': 'Database unavailable'}), 503
            
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

@app.route("/", methods=["GET"])
def health_check():
    """Health check endpoint for Render"""
    return jsonify({
        "status": "healthy",
        "message": "Interview Question Generator API is running",
        "database": "connected" if client else "disconnected"
    })

@app.route("/api/health", methods=["GET"])
def api_health():
    """API health check"""
    return jsonify({
        "status": "ok",
        "database": "connected" if client else "disconnected",
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route("/api/register", methods=["POST"])
def register():
    if not users_collection:
        return jsonify({"message": "Database unavailable"}), 503
        
    try:
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
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({"message": "Registration failed. Please try again."}), 500

@app.route("/api/login", methods=["POST"])
def login():
    if not users_collection:
        return jsonify({"message": "Database unavailable"}), 503
        
    try:
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

        password_bytes = password.encode('utf-8')
        stored_password = user['password']

        if isinstance(stored_password, str):
            stored_password = stored_password.encode('utf-8')

        try:
            password_match = bcrypt.checkpw(password_bytes, stored_password)
            if not password_match:
                return jsonify({"message": "Invalid email or password"}), 401
        except Exception as pwd_error:
            print(f"Password check error: {str(pwd_error)}")
            return jsonify({"message": "Authentication error"}), 500

        try:
            token_payload = {
                'user_id': user['_id'],
                'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION)
            }
            token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        except Exception as jwt_error:
            print(f"JWT generation error: {str(jwt_error)}")
            return jsonify({"message": "Authentication token error"}), 500

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
            secure=True,  # Enable secure cookies for production
            samesite='None',  # Allow cross-site cookies
            max_age=JWT_EXPIRATION * 3600
        )

        return response
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"message": "Login failed. Please try again."}), 500

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
    if not questions_collection:
        return jsonify({"error": "Database unavailable"}), 503
        
    try:
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

        # Clean up uploaded file
        try:
            os.remove(file_path)
        except:
            pass

        return jsonify({
            "question_set_id": question_set_id,
            "questions": questions,
            "skills": info["skills"]
        })
    except Exception as e:
        print(f"Upload resume error: {str(e)}")
        return jsonify({"error": "Failed to process resume"}), 500

@app.route("/api/upload-resume-public", methods=["POST"])
def upload_resume_public():
    if not questions_collection:
        return jsonify({"error": "Database unavailable"}), 503
        
    try:
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

        # Clean up uploaded file
        try:
            os.remove(file_path)
        except:
            pass

        return jsonify({
            "question_set_id": question_set_id,
            "questions": questions,
            "skills": info["skills"]
        })
    except Exception as e:
        print(f"Upload resume public error: {str(e)}")
        return jsonify({"error": "Failed to process resume"}), 500

@app.route("/api/process-voice", methods=["POST"])
@token_required
def process_voice(current_user):
    if not questions_collection:
        return jsonify({"error": "Database unavailable"}), 503
        
    try:
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
    except Exception as e:
        print(f"Process voice error: {str(e)}")
        return jsonify({"error": "Failed to process voice input"}), 500

@app.route("/api/process-voice-public", methods=["POST"])
def process_voice_public():
    if not questions_collection:
        return jsonify({"error": "Database unavailable"}), 503
        
    try:
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
    except Exception as e:
        print(f"Process voice public error: {str(e)}")
        return jsonify({"error": "Failed to process voice input"}), 500

@app.route("/api/question-history", methods=["GET"])
@token_required
def question_history(current_user):
    if not questions_collection:
        return jsonify({"error": "Database unavailable"}), 503
        
    try:
        history = list(questions_collection.find(
            {"user_id": current_user['_id']},
            {"_id": 1, "user_id": 0, "questions": 1, "skills": 1, "timestamp": 1}
        ))
        history.sort(key=lambda x: x["timestamp"], reverse=True)
        
        # Convert ObjectId to string for JSON serialization
        for item in history:
            item["_id"] = str(item["_id"])
        
        return jsonify(history)
    except Exception as e:
        print(f"Question history error: {str(e)}")
        return jsonify({"error": "Failed to fetch history"}), 500

@app.route("/api/question-history-public", methods=["GET"])
def question_history_public():
    if not questions_collection:
        return jsonify({"error": "Database unavailable"}), 503
        
    try:
        history = list(questions_collection.find(
            {},
            {"_id": 1, "questions": 1, "skills": 1, "timestamp": 1}
        ).sort("timestamp", -1).limit(20))
        
        # Convert ObjectId to string for JSON serialization
        for item in history:
            item["_id"] = str(item["_id"])
        
        return jsonify(history)
    except Exception as e:
        print(f"Question history public error: {str(e)}")
        return jsonify({"error": "Failed to fetch history"}), 500

@app.route("/api/change-password", methods=["POST"])
@token_required
def change_password(current_user):
    if not users_collection:
        return jsonify({"message": "Database unavailable"}), 503
        
    try:
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
    except Exception as e:
        print(f"Change password error: {str(e)}")
        return jsonify({"message": "Failed to change password"}), 500

# New endpoints for the answer evaluation feature

@app.route("/api/submit-answer", methods=["POST"])
def submit_answer():
    if not questions_collection or not user_answers_collection:
        return jsonify({"message": "Database unavailable"}), 503
        
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
        return jsonify({"error": "Failed to submit answer"}), 500
    
@app.route("/api/get-answers", methods=["GET"])
@token_required
def get_user_answers(current_user):
    if not user_answers_collection:
        return jsonify({"error": "Database unavailable"}), 503
        
    try:
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
    except Exception as e:
        print(f"Get answers error: {str(e)}")
        return jsonify({"error": "Failed to fetch answers"}), 500

@app.route("/api/get-question-set/<question_set_id>", methods=["GET"])
def get_question_set(question_set_id):
    if not questions_collection:
        return jsonify({"error": "Database unavailable"}), 503
        
    try:
        question_set = questions_collection.find_one({"_id": question_set_id})
        if not question_set:
            return jsonify({"message": "Question set not found"}), 404
            
        # Don't send expected answers to frontend
        question_set.pop("expected_answers", None)
        
        # Convert ObjectId to string for JSON serialization
        question_set["_id"] = str(question_set["_id"])
        
        return jsonify(question_set)
    except Exception as e:
        print(f"Get question set error: {str(e)}")
        return jsonify({"error": "Failed to fetch question set"}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    print(f"Unhandled exception: {str(e)}")
    return jsonify({
        "error": "An unexpected error occurred",
        "details": str(e) if app.debug else "Please try again later"
    }), 500

if __name__ == "__main__":
    # Get port from environment variable (Render requirement)
    port = int(os.environ.get("PORT", 5000))
    
    try:
        print(f"Starting Flask application on port {port}...")
        # Bind to 0.0.0.0 for Render deployment
        app.run(
            host="0.0.0.0", 
            port=port, 
            debug=False,  # Disable debug in production
            use_reloader=False
        )
    except KeyboardInterrupt:
        print("\nShutdown initiated by user")
    except Exception as e:
        print(f"Application error: {e}")
    finally:
        cleanup_resources()
