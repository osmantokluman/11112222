from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
import hashlib
import secrets

# Initialize FastAPI app
app = FastAPI(title="YAPARIM - Turkish Task Marketplace", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/yaparim")
client = AsyncIOMotorClient(MONGO_URL)
db = client.yaparim

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Turkish cities data
TURKISH_CITIES = [
    "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya", "Şanlıurfa",
    "Gaziantep", "Kocaeli", "Mersin", "Diyarbakır", "Hatay", "Manisa", "Kayseri",
    "Samsun", "Balıkesir", "Kahramanmaraş", "Van", "Aydın", "Denizli", "Muğla",
    "Eskişehir", "Tekirdağ", "Ordu", "Trabzon", "Elazığ", "Malatya", "Sakarya",
    "Erzurum", "Çanakkale", "Zonguldak", "Isparta", "Afyonkarahisar", "Tokat"
]

TASK_CATEGORIES = [
    "Temizlik", "Nakliye", "Teknoloji", "Tadilat", "Bahçıvanlık", "Alışveriş",
    "Evcil Hayvan", "Eğitim", "Güvenlik", "Muhasebe", "Tasarım", "Çeviri",
    "Fotoğrafçılık", "Catering", "Organizasyon", "Sağlık", "Hukuk", "Danışmanlık"
]

# Pydantic models
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: str = Field(..., min_length=10, max_length=15)
    city: str
    preferred_role: str = Field(..., regex="^(task_poster|service_provider|both)$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class RoleSelection(BaseModel):
    role: str = Field(..., regex="^(task_poster|service_provider)$")

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=100)
    description: str = Field(..., min_length=10, max_length=1000)
    category: str
    city: str
    district: str = Field(..., min_length=2, max_length=50)
    budget: float = Field(..., gt=0)
    deadline: datetime
    contact_info: str = Field(..., min_length=10, max_length=200)

class TaskApplication(BaseModel):
    task_id: str
    proposal: str = Field(..., min_length=10, max_length=500)
    offered_price: float = Field(..., gt=0)

class User(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    city: str
    preferred_role: str
    rating: float = 0.0
    total_tasks: int = 0
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request):
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(status_code=401, detail="Token gerekli")
    
    try:
        if token.startswith("Bearer "):
            token = token[7:]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Geçersiz token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token")
    
    user = await db.users.find_one({"_id": user_id})
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    return user

# Routes
@app.get("/")
async def root():
    return {"message": "YAPARIM - Turkish Task Marketplace API"}

@app.get("/api/cities")
async def get_cities():
    return {"cities": TURKISH_CITIES}

@app.get("/api/categories")
async def get_categories():
    return {"categories": TASK_CATEGORIES}

@app.post("/api/auth/register")
async def register(user: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Bu email adresi zaten kayıtlı")
    
    # Validate city
    if user.city not in TURKISH_CITIES:
        raise HTTPException(status_code=400, detail="Geçersiz şehir")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user.password)
    
    user_doc = {
        "_id": user_id,
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "phone": user.phone,
        "city": user.city,
        "preferred_role": user.preferred_role,
        "rating": 0.0,
        "total_tasks": 0,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )
    
    return {
        "message": "Kullanıcı başarıyla kaydedildi",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user.name,
            "email": user.email,
            "city": user.city,
            "preferred_role": user.preferred_role
        }
    }

@app.post("/api/auth/login")
async def login(user_credentials: UserLogin):
    user = await db.users.find_one({"email": user_credentials.email})
    if not user or not verify_password(user_credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Geçersiz email veya şifre")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["_id"]}, expires_delta=access_token_expires
    )
    
    return {
        "message": "Giriş başarılı",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["_id"],
            "name": user["name"],
            "email": user["email"],
            "city": user["city"],
            "preferred_role": user["preferred_role"]
        }
    }

@app.post("/api/auth/select-role")
async def select_role(role_data: RoleSelection, current_user: dict = Depends(get_current_user)):
    # Store current session role
    session_id = str(uuid.uuid4())
    session_doc = {
        "_id": session_id,
        "user_id": current_user["_id"],
        "current_role": role_data.role,
        "created_at": datetime.utcnow()
    }
    
    await db.sessions.insert_one(session_doc)
    
    return {
        "message": "Rol seçimi başarılı",
        "session_id": session_id,
        "current_role": role_data.role
    }

@app.get("/api/user/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["_id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "phone": current_user["phone"],
        "city": current_user["city"],
        "preferred_role": current_user["preferred_role"],
        "rating": current_user["rating"],
        "total_tasks": current_user["total_tasks"],
        "created_at": current_user["created_at"]
    }

@app.post("/api/tasks")
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    # Validate category and city
    if task.category not in TASK_CATEGORIES:
        raise HTTPException(status_code=400, detail="Geçersiz kategori")
    
    if task.city not in TURKISH_CITIES:
        raise HTTPException(status_code=400, detail="Geçersiz şehir")
    
    # Check if deadline is in the future
    if task.deadline <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Bitiş tarihi gelecekte olmalı")
    
    task_id = str(uuid.uuid4())
    task_doc = {
        "_id": task_id,
        "title": task.title,
        "description": task.description,
        "category": task.category,
        "city": task.city,
        "district": task.district,
        "budget": task.budget,
        "deadline": task.deadline,
        "contact_info": task.contact_info,
        "poster_id": current_user["_id"],
        "poster_name": current_user["name"],
        "status": "active",
        "applications": [],
        "created_at": datetime.utcnow()
    }
    
    await db.tasks.insert_one(task_doc)
    
    return {
        "message": "Görev başarıyla oluşturuldu",
        "task_id": task_id,
        "task": task_doc
    }

@app.get("/api/tasks")
async def get_tasks(
    city: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20,
    skip: int = 0
):
    query = {"status": "active"}
    
    if city:
        query["city"] = city
    if category:
        query["category"] = category
    
    tasks = await db.tasks.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    return {
        "tasks": tasks,
        "total": await db.tasks.count_documents(query)
    }

@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    return task

@app.post("/api/tasks/{task_id}/apply")
async def apply_for_task(
    task_id: str,
    application: TaskApplication,
    current_user: dict = Depends(get_current_user)
):
    # Check if task exists
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    if task["poster_id"] == current_user["_id"]:
        raise HTTPException(status_code=400, detail="Kendi görevinize başvuru yapamazsınız")
    
    # Check if already applied
    existing_application = await db.applications.find_one({
        "task_id": task_id,
        "applicant_id": current_user["_id"]
    })
    
    if existing_application:
        raise HTTPException(status_code=400, detail="Bu göreve zaten başvuru yaptınız")
    
    application_id = str(uuid.uuid4())
    application_doc = {
        "_id": application_id,
        "task_id": task_id,
        "applicant_id": current_user["_id"],
        "applicant_name": current_user["name"],
        "applicant_city": current_user["city"],
        "applicant_rating": current_user["rating"],
        "proposal": application.proposal,
        "offered_price": application.offered_price,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    await db.applications.insert_one(application_doc)
    
    return {
        "message": "Başvuru başarıyla gönderildi",
        "application_id": application_id
    }

@app.get("/api/tasks/{task_id}/applications")
async def get_task_applications(task_id: str, current_user: dict = Depends(get_current_user)):
    # Check if user is the task poster
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    if task["poster_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Bu görevin başvurularını görme yetkiniz yok")
    
    applications = await db.applications.find({"task_id": task_id}).to_list(length=None)
    
    return {
        "applications": applications,
        "total": len(applications)
    }

@app.get("/api/user/tasks")
async def get_user_tasks(current_user: dict = Depends(get_current_user)):
    # Get tasks created by user
    created_tasks = await db.tasks.find({"poster_id": current_user["_id"]}).sort("created_at", -1).to_list(length=None)
    
    # Get applications made by user
    applications = await db.applications.find({"applicant_id": current_user["_id"]}).sort("created_at", -1).to_list(length=None)
    
    return {
        "created_tasks": created_tasks,
        "applications": applications
    }

@app.get("/api/stats")
async def get_stats():
    total_tasks = await db.tasks.count_documents({})
    active_tasks = await db.tasks.count_documents({"status": "active"})
    total_users = await db.users.count_documents({})
    total_applications = await db.applications.count_documents({})
    
    return {
        "total_tasks": total_tasks,
        "active_tasks": active_tasks,
        "total_users": total_users,
        "total_applications": total_applications
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)