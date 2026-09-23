import os
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
SECRET_KEY = os.getenv("SECRET_KEY")

if not MONGO_URI:
    raise ValueError("MONGO_URI가 .env 파일에 설정되어 있지 않습니다.")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY가 .env 파일에 설정되어 있지 않습니다.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

client = AsyncIOMotorClient(MONGO_URI)
db = client.mtainavi_db
user_collection = db.get_collection("users")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _prepare_password(password: str) -> str:
    """
    비밀번호가 72바이트를 초과하는 경우, SHA-256으로 해시하여 
    항상 72바이트 미만의 안전한 고정 길이 문자열로 변환합니다.
    72바이트 이하인 경우는 원본 그대로 사용하여 호환성을 유지합니다.
    """
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # SHA-256을 거치면 항상 32바이트(hex로 표현 시 64바이트)가 되므로 72바이트 제한을 완벽히 통과합니다.
        return hashlib.sha256(password_bytes).hexdigest()
    return password

def get_password_hash(password: str) -> str:
    processed_password = _prepare_password(password)
    return pwd_context.hash(processed_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    processed_password = _prepare_password(plain_password)
    return pwd_context.verify(processed_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
