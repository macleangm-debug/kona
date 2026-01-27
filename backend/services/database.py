"""
Database connection and initialization
"""
from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import MONGO_URL, DB_NAME

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
