import os
import hashlib
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
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

def _hash_password_bytes(password: str) -> bytes:
    """
    비밀번호 길이와 상관없이 SHA-256으로 먼저 해시하여 
    항상 32바이트(고정 크기)로 만든 후 bcrypt에 전달합니다.
    이렇게 하면 72바이트 제한 에러가 절대 발생하지 않습니다.
    """
    password_bytes = password.encode('utf-8')
    # SHA-256을 거치면 항상 고정된 해시값이 나오고, 이를 hex 문자열로 바꾼 뒤 다시 bytes로 변환
    sha256_hash = hashlib.sha256(password_bytes).hexdigest()
    return sha256_hash.encode('utf-8')

def get_password_hash(password: str) -> str:
    safe_password_bytes = _hash_password_bytes(password)
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(safe_password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    safe_password_bytes = _hash_password_bytes(plain_password)
    return bcrypt.checkpw(safe_password_bytes, hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
