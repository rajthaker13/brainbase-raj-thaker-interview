import asyncio
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, JSON
from sqlalchemy.future import select
import os
import json
import sys

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

# Database model
class UIPI(Base):
    __tablename__ = 'uipi'
    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String, unique=True, index=True)
    workflow = Column(JSON)

# Pydantic models
class UIPICreate(BaseModel):
    endpoint: str
    workflow: List

class UIPIBase(BaseModel):
    id: int
    endpoint: str
    workflow: List

    class Config:
        orm_mode = True

# FastAPI app
app = FastAPI()

# Dependency to get DB session
async def get_db():
    async with async_session() as session:
        yield session

# Create UIPI entry
@app.post("/uipi/create", response_model=UIPIBase)
async def create_uipi(uipi: UIPICreate, db: AsyncSession = Depends(get_db)):
    new_uipi = UIPI(endpoint=uipi.endpoint.replace("/", ""), workflow=uipi.workflow)
    db.add(new_uipi)
    try:
        await db.commit()
        await db.refresh(new_uipi)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return new_uipi

# Run UIPI workflow by executing worker.py
@app.post("/uipi/run/{endpoint}")
async def run_uipi(endpoint: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UIPI).where(UIPI.endpoint == endpoint))
    uipi = result.scalar_one_or_none()
    if not uipi:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    
    # Prepare the params
    params = uipi.workflow  # This could be any data you want to pass to worker.py
    params_json = json.dumps(params)

    # Path to worker.py
    script_path = os.path.join(os.path.dirname(__file__), 'worker.py')

    # Command to run worker.py with params
    command = [sys.executable, script_path, '--params', params_json]

    try:
        # Run worker.py asynchronously
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            raise HTTPException(status_code=500, detail=stderr.decode())

        # Parse the output from worker.py
        output = stdout.decode()
        return {"message": f"Workflow for endpoint '{endpoint}' executed", "output": output}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# List all UIPI entries
@app.get("/uipi/list", response_model=List[UIPIBase])
async def list_uipi(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UIPI))
    uipi_list = result.scalars().all()
    return uipi_list

# Use lifespan event handlers
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
