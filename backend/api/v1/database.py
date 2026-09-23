import os
from pymongo import MongoClient
from dotenv import load_dotenv

# backend 폴더 안의 .env 파일을 읽어옵니다.
load_dotenv()

# .env 파일에 정의된 MONGO_URI를 가져옵니다.
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("MONGO_URI가 .env 파일에 설정되어 있지 않습니다.")

# MongoDB 클라이언트 생성
client = MongoClient(MONGO_URI)

# 💡 원하시는 'mtainavi_db' 데이터베이스 지정
db = client["mtainavi_db"]

# 회원정보를 저장할 users 컬렉션
users_collection = db["users"]