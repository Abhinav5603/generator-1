from flask import Flask, request, jsonify, make_response
from utils.extractor import extract_text, extract_info
from utils.question_generator import generate_questions
import os
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime, timedelta
import bcrypt
import jwt
import uuid
from functools import wraps

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)  # Enable CORS with credentials
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# JWT Secret Key - Replace with a secure key in production
JWT_SECRET = os.getenv("JWT_SECRET", "your_jwt_secret_key")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION = 24  # hours

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["interview_app_db"]
users_collection = db["users"]
questions_collection = db["questions"]

# Create indexes
users_collection.create_index("email", unique=True)
users_collection.create_index("username", unique=True)

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Get token from cookies
        token = request.cookies.get('token')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            # Decode the token
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
    
    # Validate data
    if not username or not email or not password:
        return jsonify({"message": "All fields are required"}), 400
    
    # Check if user already exists
    if users_collection.find_one({"email": email}):
        return jsonify({"message": "User with this email already exists"}), 409
        
    if users_collection.find_one({"username": username}):
        return jsonify({"message": "Username is already taken"}), 409
        
    # Hash the password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    # Create new user
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
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400
        
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    
    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400
        
    # Find user by email
    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"message": "Invalid email or password"}), 401
        
    # Check password
    if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
        return jsonify({"message": "Invalid email or password"}), 401
        
    # Generate JWT token
    token = jwt.encode({
        'user_id': user['_id'],
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    # Create response with token in cookie
    response = make_response(jsonify({
        "message": "Login successful",
        "user": {
            "id": user['_id'],
            "username": user['username'],
            "email": user['email']
        }
    }))
    
    # Set secure HTTP-only cookie
    response.set_cookie(
        'token',
        token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite='Lax',
        max_age=JWT_EXPIRATION * 3600  # Convert hours to seconds
    )
    
    return response

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

    # Save to MongoDB with user ID
    questions_collection.insert_one({
        "user_id": current_user['_id'],
        "questions": questions,
        "skills": info["skills"],
        "timestamp": datetime.utcnow()
    })

    return jsonify({
        "questions": questions,
        "skills": info["skills"]
    })

# New public resume upload endpoint that doesn't require authentication
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

    # Save to MongoDB with a generic user ID for public submissions
    questions_collection.insert_one({
        "user_id": "public_user",
        "questions": questions,
        "skills": info["skills"],
        "timestamp": datetime.utcnow()
    })

    return jsonify({
        "questions": questions,
        "skills": info["skills"]
    })

# Original authenticated voice endpoint
@app.route("/api/process-voice", methods=["POST"])
@token_required
def process_voice(current_user):
    data = request.json
    transcription = data.get("transcription", "")

    if not transcription:
        return jsonify({"error": "No transcription provided"}), 400

    info = extract_info(transcription)
    questions = generate_questions(skills=info["skills"], resume_text=transcription)

    # Save to MongoDB with user ID
    questions_collection.insert_one({
        "user_id": current_user['_id'],
        "questions": questions,
        "skills": info["skills"],
        "timestamp": datetime.utcnow()
    })

    return jsonify({
        "questions": questions,
        "skills": info["skills"]
    })

# New public voice endpoint that doesn't require authentication
@app.route("/api/process-voice-public", methods=["POST"])
def process_voice_public():
    data = request.json
    transcription = data.get("transcription", "")

    if not transcription:
        return jsonify({"error": "No transcription provided"}), 400

    info = extract_info(transcription)
    questions = generate_questions(skills=info["skills"], resume_text=transcription)

    # Save to MongoDB with a generic user ID for public submissions
    questions_collection.insert_one({
        "user_id": "public_user",
        "questions": questions,
        "skills": info["skills"],
        "timestamp": datetime.utcnow()
    })

    return jsonify({
        "questions": questions,
        "skills": info["skills"]
    })

# Add a new public endpoint for history that doesn't require auth
@app.route("/api/question-history-public", methods=["GET"])
def question_history_public():
    # Fetch the most recent 20 entries from the questions collection
    history = list(questions_collection.find(
        {}, 
        {"_id": 0, "user_id": 0}  # Exclude these fields
    ).sort("timestamp", -1).limit(20))  # Sort by timestamp descending and limit to 20
    
    return jsonify(history)

# Keep the authenticated endpoint too
@app.route("/api/question-history", methods=["GET"])
@token_required
def question_history(current_user):
    # Fetch only the current user's question history
    history = list(questions_collection.find(
        {"user_id": current_user['_id']}, 
        {"_id": 0, "user_id": 0}
    ))
    history.sort(key=lambda x: x["timestamp"], reverse=True)
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
        return jsonify({"message": "Current password and new password are required"}), 400
        
    # Verify current password
    if not bcrypt.checkpw(current_password.encode('utf-8'), current_user['password']):
        return jsonify({"message": "Current password is incorrect"}), 401
        
    # Hash the new password
    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    
    # Update password in database
    users_collection.update_one(
        {"_id": current_user['_id']},
        {"$set": {"password": hashed_password}}
    )
    
    return jsonify({"message": "Password changed successfully"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)