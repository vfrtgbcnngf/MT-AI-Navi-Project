from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# backend. 및 복잡한 상대 경로 없이 깔끔하게 임포트
from services.auth_service import (
    user_collection, 
    get_password_hash, 
    verify_password, 
    create_access_token, 
    SECRET_KEY, 
    ALGORITHM
)

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: str
    nickname: Optional[str] = None
    phone: Optional[str] = None
    birth: Optional[str] = None
    interests: Optional[List[str]] = []

class UserLogin(BaseModel):
    email: EmailStr
    password: str

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보가 유효하지 않습니다.",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await user_collection.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserRegister):
    existing_user = await user_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다.")

    hashed_password = get_password_hash(user_data.password)
    
    new_user = {
        "email": user_data.email,
        "password": hashed_password,
        "username": user_data.username,
        "nickname": user_data.nickname,
        "phone": user_data.phone,
        "birth": user_data.birth,
        "interests": user_data.interests,
        "created_at": datetime.utcnow()
    }
    await user_collection.insert_one(new_user)
    return {"message": "회원가입 완료"}

@router.post("/login")
async def login(user_data: UserLogin):
    user = await user_collection.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=400, detail="이메일 또는 비밀번호가 틀렸습니다.")

    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer", "username": user["username"]}

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    return {"message": "로그아웃 성공"}

@router.delete("/withdraw")
async def withdraw(current_user: dict = Depends(get_current_user)):
    await user_collection.delete_one({"email": current_user["email"]})
    return {"message": "회원탈퇴 완료"}