from fastapi import FastAPI , Depends,  UploadFile,  File
import tempfile 
import os 
from asr import transcribe_audio
from fastapi.middleware.cors import CORSMiddleware
from llm import note_decode, llm 
from database import Base, engine, getdb 
from db_model import Note
from pydantic import BaseModel 
from sqlalchemy.orm import Session

##Pydanticmodel
class NoteCreate(BaseModel):
    title: str
    content: str
    type: str
    source: str
    tone: str


app= FastAPI() 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine) ##notes.db will be created

@app.get("/")
def root():
    return {"message": "marrow is running!"}

## UI IS SENDING AUDIO FILE TO THIS ENDPOINT, AND THIS ENDPOINT IS SENDING THE AUDIO FILE TO WHISPER MODEL FOR TRANSCRIPTION.
@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    ## expects a file upload - temporary to test 
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        contents = await file.read()
        temp_file.write(contents)
        temp_file_path = temp_file.name

    try:
        transcript = transcribe_audio(temp_file_path)
        note = note_decode(transcript)
        return {"transcript": transcript, "note": note.model_dump()} ##model dump to return proper json
    
    finally:
        os.remove(temp_file_path)


@app.post("/postnotes")
def create_note_indb(
    note : NoteCreate, ##follow pydantic validation 
    db: Session = Depends(getdb)
): 
    new_note = Note (
        title = note.title , 
        content =  note.content,
        source  = note.source,
        tone = note.tone,   
        type = note.type   
    )

    db.add(new_note)
    db.commit() 
    db.refresh(new_note)

    return new_note


@app.get("/getnotes")
def get_notes(db: Session = Depends(getdb)):

    notes = db.query(Note).order_by(Note.id.desc()).all()

    return [
        {
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "source": note.source,
            "tone": note.tone,
            "type": note.type,
        }
        for note in notes
    ]


class ChatRequest(BaseModel):
    message : str 


@app.post("/chat")
def chat_with_notes(
    request: ChatRequest, 
    db: Session = Depends(getdb)
):
    notes = db.query(Note).order_by(Note.id.desc()).all()
    context = "\n\n".join(
        f"Title: {note.title}\n"
        f"Content: {note.content}\n"
        f"Type: {note.type}"
        for note in notes
    )

    prompt = f"""
            You are MindNotes AI, a personal thinking assistant.

            Answer the user's question using ONLY the notes provided below.

            If the notes do not contain enough information, say so.
            Do not invent information.

            USER QUESTION:
            {request.message}

            NOTES:
            {context}
            """

    response = llm.invoke(prompt)

    return {
        "answer": response.content
    }


    
    
