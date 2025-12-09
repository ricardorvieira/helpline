from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import csv
import io
from fastapi.responses import StreamingResponse
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'helpline-crm-secret-key-2025')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# FreePBX Webhook Secret (optional for security)
FREEPBX_WEBHOOK_SECRET = os.environ.get('FREEPBX_WEBHOOK_SECRET', '')

# Create the main app
app = FastAPI(title="HelplineOS CRM API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================

class UserRole(str, Enum):
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    AGENT = "agent"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

# ==================== MODELS ====================

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    status: str = "active"
    created_at: str
    last_login: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Admin User Management Models
class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["admin", "supervisor", "agent"] = "agent"

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[Literal["admin", "supervisor", "agent"]] = None
    status: Optional[Literal["active", "inactive"]] = None

class AdminPasswordReset(BaseModel):
    new_password: str

class AdminUserListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    status: str
    created_at: str
    last_login: Optional[str] = None

# Contact Models
class ContactCreate(BaseModel):
    phone_number: str
    name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    company: Optional[str] = None
    tags: List[str] = []

class ContactUpdate(BaseModel):
    phone_number: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    company: Optional[str] = None
    tags: Optional[List[str]] = None

class ContactResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    phone_number: str
    name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    company: Optional[str] = None
    tags: List[str] = []
    created_at: str
    updated_at: str

# Call Models
class CallCreate(BaseModel):
    caller_number: str
    duration: int = 0  # in seconds
    notes: Optional[str] = None
    call_type: str = "inquiry"  # inquiry, complaint, support
    priority: str = "normal"  # low, normal, high, urgent
    status: str = "completed"  # in_progress, completed, follow_up
    resolution_notes: Optional[str] = None
    contact_id: Optional[str] = None  # Optional: can be provided from FreePBX flow

class CallUpdate(BaseModel):
    duration: Optional[int] = None
    notes: Optional[str] = None
    call_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    resolution_notes: Optional[str] = None

class CallResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    contact_id: str
    agent_id: str
    agent_name: str
    caller_number: str
    contact_name: Optional[str] = None
    duration: int
    notes: Optional[str] = None
    call_type: str
    priority: str
    status: str
    resolution_notes: Optional[str] = None
    timestamp: str
    freepbx_call_id: Optional[str] = None

class CallStats(BaseModel):
    total_calls: int
    calls_today: int
    calls_this_week: int
    calls_by_type: dict
    calls_by_priority: dict
    calls_by_status: dict
    avg_duration: float

# FreePBX Webhook Models
class FreePBXCallEvent(BaseModel):
    """Model for FreePBX webhook payload"""
    event_type: str  # "call_answered", "call_ended", "call_started"
    caller_id: str  # The incoming caller's phone number
    extension: Optional[str] = None  # Agent's extension
    agent_username: Optional[str] = None  # Agent's username/email
    call_id: Optional[str] = None  # FreePBX unique call ID
    timestamp: Optional[str] = None
    direction: Optional[str] = "inbound"  # inbound, outbound

class FreePBXCallEventResponse(BaseModel):
    success: bool
    redirect_url: str
    contact_exists: bool
    contact_id: Optional[str] = None
    call_event_id: str
    message: str

# Call Event Model (for tracking FreePBX calls)
class CallEventResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    freepbx_call_id: Optional[str] = None
    caller_number: str
    agent_id: Optional[str] = None
    agent_extension: Optional[str] = None
    contact_id: Optional[str] = None
    contact_exists: bool
    event_type: str
    redirect_url: str
    timestamp: str
    processed: bool = False

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Check if user is active
        if user.get('status', 'active') == 'inactive':
            raise HTTPException(status_code=403, detail="Account is deactivated")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(optional_security)):
    """Get current user if token provided, otherwise return None"""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            return user
    except:
        pass
    return None

# Role-based access control helpers
def require_role(allowed_roles: List[str]):
    """Dependency factory for role-based access control"""
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get('role') not in allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

# Convenience dependencies
require_admin = require_role(["admin"])
require_supervisor_or_admin = require_role(["admin", "supervisor"])
require_any_role = require_role(["admin", "supervisor", "agent"])

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this is the first user (make them admin)
    user_count = await db.users.count_documents({})
    role = "admin" if user_count == 0 else "agent"
    
    # Create user
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": role,
        "status": "active",
        "created_at": now,
        "last_login": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, role)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role=role,
            status="active",
            created_at=now,
            last_login=now
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user is active
    if user.get('status', 'active') == 'inactive':
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact administrator.")
    
    # Update last login
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": user['id']}, {"$set": {"last_login": now}})
    
    token = create_token(user['id'], user['role'])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user['id'],
            email=user['email'],
            name=user['name'],
            role=user['role'],
            status=user.get('status', 'active'),
            created_at=user['created_at'],
            last_login=now
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user['id'],
        email=current_user['email'],
        name=current_user['name'],
        role=current_user['role'],
        status=current_user.get('status', 'active'),
        created_at=current_user['created_at'],
        last_login=current_user.get('last_login')
    )

# ==================== ADMIN USER MANAGEMENT ROUTES ====================

@api_router.get("/admin/users", response_model=List[AdminUserListResponse])
async def admin_list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """List all users (admin only)"""
    query = {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    if role:
        query["role"] = role
    
    if status:
        query["status"] = status
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    
    # Ensure all users have status field
    for user in users:
        if 'status' not in user:
            user['status'] = 'active'
    
    return users

@api_router.post("/admin/users", response_model=AdminUserListResponse)
async def admin_create_user(
    user_data: AdminUserCreate,
    current_user: dict = Depends(require_admin)
):
    """Create a new user (admin only)"""
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "status": "active",
        "created_at": now,
        "last_login": None
    }
    
    await db.users.insert_one(user_doc)
    
    logger.info(f"Admin {current_user['email']} created user {user_data.email} with role {user_data.role}")
    
    return AdminUserListResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        status="active",
        created_at=now,
        last_login=None
    )

@api_router.get("/admin/users/{user_id}", response_model=AdminUserListResponse)
async def admin_get_user(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    """Get a specific user (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if 'status' not in user:
        user['status'] = 'active'
    
    return user

@api_router.put("/admin/users/{user_id}", response_model=AdminUserListResponse)
async def admin_update_user(
    user_id: str,
    user_data: AdminUserUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update a user (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from demoting themselves
    if user_id == current_user['id'] and user_data.role and user_data.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    # Prevent admin from deactivating themselves
    if user_id == current_user['id'] and user_data.status == "inactive":
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    
    if 'status' not in updated:
        updated['status'] = 'active'
    
    logger.info(f"Admin {current_user['email']} updated user {user_id}: {update_data}")
    
    return updated

@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: str,
    password_data: AdminPasswordReset,
    current_user: dict = Depends(require_admin)
):
    """Reset a user's password (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    new_hash = hash_password(password_data.new_password)
    await db.users.update_one({"id": user_id}, {"$set": {"password_hash": new_hash}})
    
    logger.info(f"Admin {current_user['email']} reset password for user {user_id}")
    
    return {"message": "Password reset successfully"}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    """Delete a user (admin only)"""
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.delete_one({"id": user_id})
    
    logger.info(f"Admin {current_user['email']} deleted user {user_id}")
    
    return {"message": "User deleted successfully"}

@api_router.get("/admin/stats")
async def admin_get_stats(current_user: dict = Depends(require_admin)):
    """Get admin dashboard statistics"""
    # User stats
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"status": {"$ne": "inactive"}})
    
    # User by role
    users_by_role = {}
    for role in ["admin", "supervisor", "agent"]:
        users_by_role[role] = await db.users.count_documents({"role": role})
    
    # Contact and call stats
    total_contacts = await db.contacts.count_documents({})
    total_calls = await db.calls.count_documents({})
    
    # Recent activity (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_calls = await db.calls.count_documents({"timestamp": {"$gte": week_ago}})
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "by_role": users_by_role
        },
        "contacts": {
            "total": total_contacts
        },
        "calls": {
            "total": total_calls,
            "last_7_days": recent_calls
        }
    }

# ==================== FREEPBX WEBHOOK ROUTES ====================

@api_router.post("/freepbx/call-event", response_model=FreePBXCallEventResponse)
async def handle_freepbx_call_event(
    event: FreePBXCallEvent,
    webhook_secret: Optional[str] = Query(None, alias="secret")
):
    """
    Handle incoming call events from FreePBX.
    
    When a call is answered:
    1. Look up contact by caller_id (phone number)
    2. Find agent by extension or username
    3. Create call event record
    4. Return redirect URL:
       - If contact exists: /calls/new?contact={contactId}&phone={callerNumber}&callEventId={eventId}
       - If no contact: /contacts/new?phone={callerNumber}&callEventId={eventId}
    """
    # Verify webhook secret if configured
    if FREEPBX_WEBHOOK_SECRET and webhook_secret != FREEPBX_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")
    
    logger.info(f"FreePBX call event received: {event.event_type} from {event.caller_id}")
    
    # Normalize phone number (remove spaces, dashes, etc.)
    caller_number = ''.join(filter(lambda x: x.isdigit() or x == '+', event.caller_id))
    
    # Look up contact by phone number
    contact = await db.contacts.find_one({"phone_number": caller_number}, {"_id": 0})
    
    # Also try with original caller_id format
    if not contact:
        contact = await db.contacts.find_one({"phone_number": event.caller_id}, {"_id": 0})
    
    contact_exists = contact is not None
    contact_id = contact['id'] if contact else None
    
    # Find agent by extension or username
    agent = None
    if event.agent_username:
        agent = await db.users.find_one({"email": event.agent_username}, {"_id": 0, "password_hash": 0})
    
    if not agent and event.extension:
        # Try to find agent by extension (stored in user profile or separate mapping)
        agent = await db.users.find_one({"extension": event.extension}, {"_id": 0, "password_hash": 0})
    
    # Create call event record
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Determine redirect URL
    if contact_exists:
        redirect_url = f"/calls/new?contact={contact_id}&phone={caller_number}&callEventId={event_id}"
        message = f"Contact found: {contact.get('name') or caller_number}"
    else:
        redirect_url = f"/contacts/new?phone={caller_number}&callEventId={event_id}"
        message = f"New caller: {caller_number} - Create contact first"
    
    call_event_doc = {
        "id": event_id,
        "freepbx_call_id": event.call_id,
        "caller_number": caller_number,
        "agent_id": agent['id'] if agent else None,
        "agent_extension": event.extension,
        "contact_id": contact_id,
        "contact_exists": contact_exists,
        "event_type": event.event_type,
        "direction": event.direction or "inbound",
        "redirect_url": redirect_url,
        "timestamp": event.timestamp or now,
        "created_at": now,
        "processed": False
    }
    
    await db.call_events.insert_one(call_event_doc)
    
    logger.info(f"Call event {event_id} created. Redirect: {redirect_url}")
    
    return FreePBXCallEventResponse(
        success=True,
        redirect_url=redirect_url,
        contact_exists=contact_exists,
        contact_id=contact_id,
        call_event_id=event_id,
        message=message
    )

@api_router.get("/freepbx/call-events")
async def get_call_events(
    agent_id: Optional[str] = None,
    processed: Optional[bool] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get recent call events for an agent"""
    query = {}
    
    if agent_id:
        query["agent_id"] = agent_id
    elif current_user['role'] == 'agent':
        # Agents can only see their own events
        query["agent_id"] = current_user['id']
    
    if processed is not None:
        query["processed"] = processed
    
    events = await db.call_events.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return events

@api_router.get("/freepbx/call-events/{event_id}")
async def get_call_event(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific call event"""
    event = await db.call_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Call event not found")
    return event

@api_router.put("/freepbx/call-events/{event_id}/mark-processed")
async def mark_call_event_processed(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a call event as processed (after agent handles it)"""
    event = await db.call_events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Call event not found")
    
    await db.call_events.update_one(
        {"id": event_id}, 
        {"$set": {"processed": True, "processed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Call event marked as processed"}

@api_router.get("/freepbx/pending-calls")
async def get_pending_calls(current_user: dict = Depends(get_current_user)):
    """Get unprocessed call events for current agent (for real-time notifications)"""
    query = {
        "processed": False
    }
    
    # Agents see their own calls, supervisors/admins see all
    if current_user['role'] == 'agent':
        query["agent_id"] = current_user['id']
    
    events = await db.call_events.find(query, {"_id": 0}).sort("created_at", -1).to_list(10)
    return events

# ==================== CONTACT ROUTES ====================

@api_router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(
    search: Optional[str] = None,
    tag: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone_number": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}}
        ]
    
    if tag:
        query["tags"] = tag
    
    contacts = await db.contacts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return contacts

@api_router.post("/contacts", response_model=ContactResponse)
async def create_contact(
    contact_data: ContactCreate,
    current_user: dict = Depends(get_current_user)
):
    # Check if phone number already exists
    existing = await db.contacts.find_one({"phone_number": contact_data.phone_number})
    if existing:
        raise HTTPException(status_code=400, detail="Contact with this phone number already exists")
    
    contact_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    contact_doc = {
        "id": contact_id,
        "phone_number": contact_data.phone_number,
        "name": contact_data.name,
        "email": contact_data.email,
        "address": contact_data.address,
        "company": contact_data.company,
        "tags": contact_data.tags,
        "created_at": now,
        "updated_at": now
    }
    
    await db.contacts.insert_one(contact_doc)
    return contact_doc

@api_router.get("/contacts/by-phone/{phone_number}")
async def get_contact_by_phone(
    phone_number: str,
    current_user: dict = Depends(get_current_user)
):
    contact = await db.contacts.find_one({"phone_number": phone_number}, {"_id": 0})
    if not contact:
        return {"found": False, "contact": None}
    return {"found": True, "contact": contact}

@api_router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    current_user: dict = Depends(get_current_user)
):
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@api_router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    contact_data: ContactUpdate,
    current_user: dict = Depends(get_current_user)
):
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = {k: v for k, v in contact_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return updated

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted successfully"}

# ==================== CALL ROUTES ====================

@api_router.get("/calls", response_model=List[CallResponse])
async def get_calls(
    search: Optional[str] = None,
    call_type: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if search:
        query["$or"] = [
            {"caller_number": {"$regex": search, "$options": "i"}},
            {"contact_name": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}}
        ]
    
    if call_type:
        query["call_type"] = call_type
    if priority:
        query["priority"] = priority
    if status:
        query["status"] = status
    
    if date_from:
        query["timestamp"] = query.get("timestamp", {})
        query["timestamp"]["$gte"] = date_from
    if date_to:
        query["timestamp"] = query.get("timestamp", {})
        query["timestamp"]["$lte"] = date_to
    
    calls = await db.calls.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    return calls

@api_router.post("/calls", response_model=CallResponse)
async def create_call(
    call_data: CallCreate,
    call_event_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    # Check if contact exists, if not create one
    contact = None
    
    if call_data.contact_id:
        contact = await db.contacts.find_one({"id": call_data.contact_id}, {"_id": 0})
    
    if not contact:
        contact = await db.contacts.find_one({"phone_number": call_data.caller_number}, {"_id": 0})
    
    if not contact:
        # Auto-create contact
        contact_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        contact = {
            "id": contact_id,
            "phone_number": call_data.caller_number,
            "name": None,
            "email": None,
            "address": None,
            "company": None,
            "tags": [],
            "created_at": now,
            "updated_at": now
        }
        
        await db.contacts.insert_one(contact)
        logger.info(f"Auto-created contact for phone: {call_data.caller_number}")
    
    # Create call record
    call_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    call_doc = {
        "id": call_id,
        "contact_id": contact['id'],
        "agent_id": current_user['id'],
        "agent_name": current_user['name'],
        "caller_number": call_data.caller_number,
        "contact_name": contact.get('name'),
        "duration": call_data.duration,
        "notes": call_data.notes,
        "call_type": call_data.call_type,
        "priority": call_data.priority,
        "status": call_data.status,
        "resolution_notes": call_data.resolution_notes,
        "timestamp": now,
        "freepbx_call_id": None
    }
    
    # Link to FreePBX call event if provided
    if call_event_id:
        call_event = await db.call_events.find_one({"id": call_event_id})
        if call_event:
            call_doc["freepbx_call_id"] = call_event.get("freepbx_call_id")
            # Mark event as processed
            await db.call_events.update_one(
                {"id": call_event_id},
                {"$set": {"processed": True, "processed_at": now, "call_id": call_id}}
            )
    
    await db.calls.insert_one(call_doc)
    return call_doc

@api_router.get("/calls/stats", response_model=CallStats)
async def get_call_stats(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Total calls
    total_calls = await db.calls.count_documents({})
    
    # Calls today
    calls_today = await db.calls.count_documents({"timestamp": {"$gte": today_start}})
    
    # Calls this week
    calls_this_week = await db.calls.count_documents({"timestamp": {"$gte": week_start}})
    
    # Calls by type
    pipeline_type = [
        {"$group": {"_id": "$call_type", "count": {"$sum": 1}}}
    ]
    calls_by_type_cursor = db.calls.aggregate(pipeline_type)
    calls_by_type = {doc['_id']: doc['count'] async for doc in calls_by_type_cursor}
    
    # Calls by priority
    pipeline_priority = [
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]
    calls_by_priority_cursor = db.calls.aggregate(pipeline_priority)
    calls_by_priority = {doc['_id']: doc['count'] async for doc in calls_by_priority_cursor}
    
    # Calls by status
    pipeline_status = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    calls_by_status_cursor = db.calls.aggregate(pipeline_status)
    calls_by_status = {doc['_id']: doc['count'] async for doc in calls_by_status_cursor}
    
    # Average duration
    pipeline_avg = [
        {"$group": {"_id": None, "avg_duration": {"$avg": "$duration"}}}
    ]
    avg_cursor = db.calls.aggregate(pipeline_avg)
    avg_result = await avg_cursor.to_list(1)
    avg_duration = avg_result[0]['avg_duration'] if avg_result and avg_result[0]['avg_duration'] else 0
    
    return CallStats(
        total_calls=total_calls,
        calls_today=calls_today,
        calls_this_week=calls_this_week,
        calls_by_type=calls_by_type,
        calls_by_priority=calls_by_priority,
        calls_by_status=calls_by_status,
        avg_duration=avg_duration
    )

@api_router.get("/calls/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: str,
    current_user: dict = Depends(get_current_user)
):
    call = await db.calls.find_one({"id": call_id}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call

@api_router.put("/calls/{call_id}", response_model=CallResponse)
async def update_call(
    call_id: str,
    call_data: CallUpdate,
    current_user: dict = Depends(get_current_user)
):
    call = await db.calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    update_data = {k: v for k, v in call_data.model_dump().items() if v is not None}
    
    await db.calls.update_one({"id": call_id}, {"$set": update_data})
    
    updated = await db.calls.find_one({"id": call_id}, {"_id": 0})
    return updated

@api_router.get("/calls/export/csv")
async def export_calls_csv(
    call_type: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if call_type:
        query["call_type"] = call_type
    if priority:
        query["priority"] = priority
    if status:
        query["status"] = status
    if date_from:
        query["timestamp"] = query.get("timestamp", {})
        query["timestamp"]["$gte"] = date_from
    if date_to:
        query["timestamp"] = query.get("timestamp", {})
        query["timestamp"]["$lte"] = date_to
    
    calls = await db.calls.find(query, {"_id": 0}).sort("timestamp", -1).to_list(10000)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        'ID', 'Caller Number', 'Contact Name', 'Agent', 'Duration (s)',
        'Call Type', 'Priority', 'Status', 'Notes', 'Resolution Notes', 'Timestamp'
    ])
    
    # Data
    for call in calls:
        writer.writerow([
            call['id'],
            call['caller_number'],
            call.get('contact_name', ''),
            call['agent_name'],
            call['duration'],
            call['call_type'],
            call['priority'],
            call['status'],
            call.get('notes', ''),
            call.get('resolution_notes', ''),
            call['timestamp']
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=calls_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

# Health check
@api_router.get("/")
async def root():
    return {"message": "HelplineOS CRM API", "status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
