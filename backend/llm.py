from langchain_groq import ChatGroq 
from pydantic import BaseModel
from dotenv import load_dotenv 

load_dotenv()

## call the model
llm = ChatGroq(
    model = "qwen/qwen3.8-27b", 
    temperature = 0
)

## pydantic validation 
class NoteRequest(BaseModel):
    title : str 
    content: str
    type : str 


## create a structured llm with this class 
structred_llm = llm.with_structured_output(NoteRequest)

## create extraction function 
def note_decode(text: str) -> NoteRequest:
    prompt = f"""
You are an assistant that organises personal notes and helps answer questions for it. 
Analyse the following transcript. 
Transscript {text}

Extract the following information from the transcript and return it in a JSON format.
- title: A short title for the note.
- content: The main content of the note.
- type: The type of note. It can be one of the following: "task", "note", "idea", "resource", "reminder"
Return the JSON in the following format:

NOTE : Donot invent new information. Only extract information from the transcript. If the information is not present, return an empty string for that field.
"""
    #print(text)
    #print(prompt)
    return structred_llm.invoke(prompt)


def test_llm():
    result = note_decode("Complete Langgraph tutorial from YT")
    print(result)
    print(type(result))


if __name__ == "__main__":
    print(test_llm())