from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    # Se MONGO_URL não estiver definida (o que não deve acontecer no Vercel, mas é seguro checar)
    raise RuntimeError("A variável de ambiente MONGO_URL não está definida.")
client = AsyncIOMotorClient(mongo_url)
db_name = os.environ.get('DB_NAME', 'license_system')

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production-xyz123')
ALGORITHM = "HS256"

# Create the main app
app = FastAPI()
#api_router = APIRouter(prefix="/api")
api_router = APIRouter()

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    role: str = "user"  # admin or user
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    version: str = "1.0.0"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    version: str = "1.0.0"

class License(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    license_key: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    domain: str
    product_id: str
    user_id: str
    expiration_date: datetime
    status: str = "active"  # active, inactive, expired
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LicenseCreate(BaseModel):
    client_name: str
    domain: str
    product_id: str
    user_id: str
    expiration_date: datetime
    status: str = "active"

class LicenseUpdate(BaseModel):
    client_name: Optional[str] = None
    domain: Optional[str] = None
    product_id: Optional[str] = None
    expiration_date: Optional[datetime] = None
    status: Optional[str] = None

class LicenseVerifyRequest(BaseModel):
    license_key: str
    domain: str
    product_name: str

class LicenseVerifyResponse(BaseModel):
    valid: bool
    message: str
    license_data: Optional[dict] = None

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: "settings")
    site_name: str = "License Manager"
    mercadopago_access_token: Optional[str] = None
    mercadopago_public_key: Optional[str] = None
    enable_payments: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    site_name: Optional[str] = None
    mercadopago_access_token: Optional[str] = None
    mercadopago_public_key: Optional[str] = None
    enable_payments: Optional[bool] = None

class PaymentPreference(BaseModel):
    title: str
    description: str
    amount: float
    product_id: str
    license_id: str

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user_doc is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ============= AUTH ROUTES =============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(email=user_data.email, role=user_data.role)
    user_doc = user.model_dump()
    user_doc['password_hash'] = hash_password(user_data.password)
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_doc)
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {"token": token, "user": user}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ============= PRODUCT ROUTES (ADMIN) =============

@api_router.get("/products", response_model=List[Product])
async def get_products(current_user: User = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    for p in products:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return products

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, admin: User = Depends(get_admin_user)):
    product = Product(**product_data.model_dump())
    product_doc = product.model_dump()
    product_doc['created_at'] = product_doc['created_at'].isoformat()
    
    await db.products.insert_one(product_doc)
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, admin: User = Depends(get_admin_user)):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.products.update_one(
        {"id": product_id},
        {"$set": product_data.model_dump()}
    )
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Product(**updated)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: User = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ============= LICENSE ROUTES =============

@api_router.get("/licenses", response_model=List[License])
async def get_licenses(current_user: User = Depends(get_current_user)):
    query = {} if current_user.role == "admin" else {"user_id": current_user.id}
    licenses = await db.licenses.find(query, {"_id": 0}).to_list(1000)
    
    for lic in licenses:
        for field in ['created_at', 'updated_at', 'expiration_date']:
            if isinstance(lic.get(field), str):
                lic[field] = datetime.fromisoformat(lic[field])
    
    return licenses

@api_router.post("/licenses", response_model=License)
async def create_license(license_data: LicenseCreate, admin: User = Depends(get_admin_user)):
    # Verify product exists
    product = await db.products.find_one({"id": license_data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Verify user exists
    user = await db.users.find_one({"id": license_data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    license_obj = License(**license_data.model_dump())
    license_doc = license_obj.model_dump()
    license_doc['created_at'] = license_doc['created_at'].isoformat()
    license_doc['updated_at'] = license_doc['updated_at'].isoformat()
    license_doc['expiration_date'] = license_doc['expiration_date'].isoformat()
    
    await db.licenses.insert_one(license_doc)
    return license_obj

@api_router.put("/licenses/{license_id}", response_model=License)
async def update_license(license_id: str, license_data: LicenseUpdate, admin: User = Depends(get_admin_user)):
    existing = await db.licenses.find_one({"id": license_id})
    if not existing:
        raise HTTPException(status_code=404, detail="License not found")
    
    update_data = {k: v for k, v in license_data.model_dump().items() if v is not None}
    if update_data:
        if 'expiration_date' in update_data:
            update_data['expiration_date'] = update_data['expiration_date'].isoformat()
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.licenses.update_one(
            {"id": license_id},
            {"$set": update_data}
        )
    
    updated = await db.licenses.find_one({"id": license_id}, {"_id": 0})
    for field in ['created_at', 'updated_at', 'expiration_date']:
        if isinstance(updated.get(field), str):
            updated[field] = datetime.fromisoformat(updated[field])
    return License(**updated)

@api_router.delete("/licenses/{license_id}")
async def delete_license(license_id: str, admin: User = Depends(get_admin_user)):
    result = await db.licenses.delete_one({"id": license_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="License not found")
    return {"message": "License deleted"}

# ============= USER MANAGEMENT (ADMIN) =============

@api_router.get("/users", response_model=List[User])
async def get_users(admin: User = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(get_admin_user)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ============= PUBLIC LICENSE VERIFICATION =============

@api_router.post("/verify", response_model=LicenseVerifyResponse)
async def verify_license(verify_req: LicenseVerifyRequest):
    # Find license by key
    license_doc = await db.licenses.find_one({"license_key": verify_req.license_key}, {"_id": 0})
    
    if not license_doc:
        return LicenseVerifyResponse(
            valid=False,
            message="Invalid license key"
        )
    
    # Parse dates
    for field in ['created_at', 'updated_at', 'expiration_date']:
        if isinstance(license_doc.get(field), str):
            license_doc[field] = datetime.fromisoformat(license_doc[field])
    
    license_obj = License(**license_doc)
    
    # Check domain (exact match)
    if license_obj.domain != verify_req.domain:
        return LicenseVerifyResponse(
            valid=False,
            message="Domain mismatch"
        )
    
    # Check product
    product = await db.products.find_one({"id": license_obj.product_id}, {"_id": 0})
    if not product or product['name'] != verify_req.product_name:
        return LicenseVerifyResponse(
            valid=False,
            message="Product mismatch"
        )
    
    # Check status
    if license_obj.status != "active":
        return LicenseVerifyResponse(
            valid=False,
            message=f"License is {license_obj.status}"
        )
    
    # Check expiration
    if license_obj.expiration_date < datetime.now(timezone.utc):
        # Auto-update to expired
        await db.licenses.update_one(
            {"id": license_obj.id},
            {"$set": {"status": "expired"}}
        )
        return LicenseVerifyResponse(
            valid=False,
            message="License has expired"
        )
    
    return LicenseVerifyResponse(
        valid=True,
        message="License is valid",
        license_data={
            "client_name": license_obj.client_name,
            "expiration_date": license_obj.expiration_date.isoformat(),
            "product_id": license_obj.product_id
        }
    )

# ============= DASHBOARD STATS (ADMIN) =============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(admin: User = Depends(get_admin_user)):
    total_licenses = await db.licenses.count_documents({})
    active_licenses = await db.licenses.count_documents({"status": "active"})
    total_products = await db.products.count_documents({})
    total_users = await db.users.count_documents({})
    
    return {
        "total_licenses": total_licenses,
        "active_licenses": active_licenses,
        "total_products": total_products,
        "total_users": total_users
    }

# ============= SETTINGS ROUTES (ADMIN) =============

@api_router.get("/settings", response_model=Settings)
async def get_settings(admin: User = Depends(get_admin_user)):
    settings_doc = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings_doc:
        default_settings = Settings()
        settings_dict = default_settings.model_dump()
        settings_dict['updated_at'] = settings_dict['updated_at'].isoformat()
        await db.settings.insert_one(settings_dict)
        return default_settings
    
    if isinstance(settings_doc.get('updated_at'), str):
        settings_doc['updated_at'] = datetime.fromisoformat(settings_doc['updated_at'])
    return Settings(**settings_doc)

@api_router.put("/settings", response_model=Settings)
async def update_settings(settings_data: SettingsUpdate, admin: User = Depends(get_admin_user)):
    update_dict = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    if update_dict:
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.settings.update_one(
            {"id": "settings"},
            {"$set": update_dict},
            upsert=True
        )
    
    updated = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return Settings(**updated)

# ============= MERCADO PAGO PAYMENT ROUTES =============

@api_router.post("/create-payment-preference")
async def create_payment_preference(
    payment_data: PaymentPreference,
    current_user: User = Depends(get_current_user)
):
    try:
        # Get settings to check if payments are enabled and get API keys
        settings_doc = await db.settings.find_one({"id": "settings"})
        if not settings_doc or not settings_doc.get('enable_payments'):
            raise HTTPException(status_code=400, detail="Payments are not enabled")
        
        if not settings_doc.get('mercadopago_access_token'):
            raise HTTPException(status_code=400, detail="Mercado Pago not configured")
        
        import mercadopago
        sdk = mercadopago.SDK(settings_doc['mercadopago_access_token'])
        
        # Get product details
        product = await db.products.find_one({"id": payment_data.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Create preference
        preference_data = {
            "items": [
                {
                    "title": payment_data.title,
                    "description": payment_data.description,
                    "quantity": 1,
                    "currency_id": "BRL",
                    "unit_price": payment_data.amount
                }
            ],
            "back_urls": {
                "success": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/success",
                "failure": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/failure",
                "pending": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/pending"
            },
            "auto_return": "approved",
            "external_reference": f"{payment_data.license_id}_{payment_data.product_id}",
            "metadata": {
                "license_id": payment_data.license_id,
                "product_id": payment_data.product_id,
                "user_id": current_user.id
            }
        }
        
        result = sdk.preference().create(preference_data)
        response = result["response"]
        
        return {
            "preference_id": response["id"],
            "init_point": response["init_point"],
            "sandbox_init_point": response.get("sandbox_init_point")
        }
        
    except Exception as e:
        logger.error(f"Error creating payment preference: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/webhook/mercadopago")
async def mercadopago_webhook(request: dict):
    """Webhook para receber notificações de pagamento do Mercado Pago"""
    try:
        logger.info(f"Mercado Pago webhook received: {request}")
        
        # Processar notificação de pagamento
        if request.get("type") == "payment":
            payment_id = request.get("data", {}).get("id")
            
            if payment_id:
                # Aqui você processaria o pagamento
                # Por enquanto apenas log
                logger.info(f"Payment notification received for: {payment_id}")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error"}

# Include router
# app.include_router(api_router)
app.include_router(api_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
