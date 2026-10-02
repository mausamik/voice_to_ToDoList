'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';

type Note = {
  id: number;
  title: string;
  content: string;
  source: 'Voice' | 'Text';
  tone: 'sage' | 'blue' | 'sand' | 'rose';
};

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
};

export default function Workspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');

  // RECORDING BUTTON - VOICE 
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
// what is it doing ? isrecording --> controls whether we are currently recording 
// mediarecorderref --> keeps the browsers mediarecorder object 
//audiochunksref --> store pieces of recorded audio 

    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<
      { role: "user" | "assistant"; content: string }[]
    >([]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });

        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.start();

        setIsRecording(true);
};

    const stopRecording = () => {
        const mediaRecorder = mediaRecorderRef.current;

        if (!mediaRecorder) {
            return;
        }

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(
                audioChunksRef.current,
                { type: mediaRecorder.mimeType }
            );

            console.log("Recorded audio:", audioBlob);
            console.log("Audio type:", audioBlob.type);
            console.log("Audio size:", audioBlob.size);

            const formData = new FormData();

            formData.append(
                "file",
                audioBlob,
                "recording.webm"
            );

            const response = await fetch(
                "http://127.0.0.1:8000/transcribe",
                {
                method: "POST",
                body: formData,
                }
            );

            const data = await response.json();

            console.log("AI response:", data);

            addVoiceNote(data.note); 

            mediaRecorder.stream
                .getTracks()
                .forEach((track) => track.stop());
            };

        mediaRecorder.stop();

        setIsRecording(false);
        };

    useEffect(() => {
        const loadNotes = async () => {
            try {
            const response = await fetch(
                "http://127.0.0.1:8000/getnotes" //GET NOTES FROM DB ON LOAD 
            );

            const data = await response.json();

            setNotes(data);
            } catch (error) {
            console.error("Failed to load notes:", error);
            }
        };

        loadNotes();
        }, []);


     async function addVoiceNote(note: {
        title: string ; 
        content : string ; 
        type: string ; 

    }) {
        const response = await fetch (
            "http://127.0.0.1:8000/postnotes", 
            {
                method:"POST", 
                headers: {
                    "Content-Type": "application/json",
                }, 
                body: JSON.stringify({
                title: note.title,
                content: note.content,
                source: "Voice",
                tone: "sage",
                type: note.type,
                }),
            }
            );

            if (!response.ok) {
                console.error("Failed to save note to DB");
                return;
            }

            const savedNote = await response.json(); 
            setNotes((current) => [
                savedNote,
                ...current,
            ]);

        // store this note also in DB 
        // MAKE A POST REQUEST TO /notes

        
        
    }
  function addNote() {
    const id = Date.now();
    setNotes((current) => [
      { id, title: '', content: '', source: 'Text', tone: 'sage' },
      ...current,
    ]);
    setEditingId(id);
  }

  function updateNote(id: number, field: 'title' | 'content', value: string) {
    setNotes((current) =>
      current.map((note) => (note.id === id ? { ...note, [field]: value } : note)),
    );
  }

  function saveNote(id: number) {
    setNotes((current) =>
      current.map((note) =>
        note.id === id ? { ...note, title: note.title.trim() || 'Untitled note' } : note,
      ),
    );
    setEditingId(null);
  }

  function deleteNote(id: number) {
    setNotes((current) => current.filter((note) => note.id !== id));
    if (editingId === id) setEditingId(null);
  }

  async function sendMessage() {
    if(!chatInput.trim() || isChatLoading){
      return ; 
    }
    const message = chatInput.trim() ;
    //Show user message in the chat 
    setChatMessages((current) => [...current, { role: "user", content: message }]);
    setChatInput("") ; 
    setIsChatLoading(true) ;

    //send this message to backend
    try {
    const response = await fetch(
      "http://127.0.0.1:8000/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get chat response");
    }

    const data = await response.json();

    //Show AI response in the chat
    setChatMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: data.answer,
      },
    ]);

  } catch (error) {
    console.error("Chat error:", error);

    setChatMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: "Sorry, I couldn't process that.",
      },
    ]);
  } finally {
    setIsChatLoading(false);
  }


  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="Morrow workspace home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 16.5 9.1 7l3.2 7.1 2.1-4.4 4.6 6.8" />
              <path d="M4.5 19h15" />
            </svg>
          </span>
          <span className="brand-name">morrow</span>
        </a>

        <nav className="top-nav" aria-label="Workspace navigation">
          <a className="nav-link active" href="#notes">Workspace</a>
          <span className="nav-divider" aria-hidden="true" />
          <span className="workspace-label">Personal space</span>
        </nav>

        <div className="profile-mark" aria-label="Personal workspace">M</div>
      </header>

      <div className="workspace-content" id="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h1>A place to think.</h1>
            <p className="page-subtitle">Keep the useful bits close. Pick up where you left off.</p>
          </div>
          <span className="local-label"><span /> Personal workspace</span>
        </div>

        <div className="workspace-grid">
          <section className="notes-panel" id="notes" aria-labelledby="notes-heading">
            <div className="section-heading">
              <div>
                <h2 id="notes-heading">Your notes</h2>
                <p>A running collection of thoughts and threads.</p>
              </div>
              <button className="new-note-button" onClick={addNote} type="button">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>
                <span>New note</span>
              </button>
            </div>

            <div className="notes-grid">
              {notes.map((note) => (
                <article className="note-card" data-tone={note.tone} key={note.id}>
                  {editingId === note.id ? (
                    <div className="note-editor">
                      <label className="sr-only" htmlFor={`title-${note.id}`}>Note title</label>
                      <input
                        autoFocus
                        className="note-title-input"
                        id={`title-${note.id}`}
                        maxLength={80}
                        onChange={(event) => updateNote(note.id, 'title', event.target.value)}
                        placeholder="Note title"
                        value={note.title}
                      />
                      <label className="sr-only" htmlFor={`content-${note.id}`}>Note content</label>
                      <textarea
                        className="note-content-input"
                        id={`content-${note.id}`}
                        onChange={(event) => updateNote(note.id, 'content', event.target.value)}
                        placeholder="Add a thought..."
                        rows={4}
                        value={note.content}
                      />
                      <div className="editor-actions">
                        <button className="text-button" onClick={() => deleteNote(note.id)} type="button">Discard</button>
                        <button className="save-button" onClick={() => saveNote(note.id)} type="button">Save note</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="note-card-top">
                        <span className="note-source"><span className="source-dot" />{note.source}</span>
                        <div className="note-actions">
                          <button
                            aria-label={`Edit ${note.title || 'note'}`}
                            className="icon-button"
                            onClick={() => setEditingId(note.id)}
                            title="Edit note"
                            type="button"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m13.6 4.4 2 2M4 16l3.7-.8 8.8-8.8a1.4 1.4 0 0 0-2-2l-8.8 8.8L4 16Z" /></svg>
                          </button>
                          <button
                            aria-label={`Delete ${note.title || 'note'}`}
                            className="icon-button"
                            onClick={() => deleteNote(note.id)}
                            title="Delete note"
                            type="button"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 6.5h9M8 6.5V4.8h4v1.7m-5.5 0 .5 9h6l.5-9M8.5 9v4.5m3-4.5v4.5" /></svg>
                          </button>
                        </div>
                      </div>
                      <h3>{note.title || 'Untitled note'}</h3>
                      <p className="note-content">{note.content || 'No content yet.'}</p>
                      <span className="note-time">Today</span>
                    </>
                  )}
                </article>
              ))}
              {notes.length === 0 && (
                <div className="empty-notes">
                  <span className="empty-state-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M7 4.75h7l4 4v10.5H7a2 2 0 0 1-2-2v-10.5a2 2 0 0 1 2-2Z" /><path d="M14 5v4h4M9 13h6m-6 3h6" /></svg>
                  </span>
                  <h3>No notes yet</h3>
                  <p>Add a note to keep an idea close at hand.</p>
                  <button className="empty-state-button" onClick={addNote} type="button">Create a note</button>
                </div>
              )}
            </div>
          </section>

          <section className="chat-panel" aria-labelledby="chat-heading">
            <div className="chat-header">
              <div className="assistant-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M6 16.5 9.5 8l2.7 6 1.8-3.6 4 6.1" /><path d="M5 19h14" /></svg>
              </div>
              <div className="chat-title-group">
                <h2 id="chat-heading">Thinking partner</h2>
                <span>Conversation</span>
              </div>
              <button className="more-button" type="button" aria-label="Conversation options" title="Conversation options">
                <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="4" cy="10" r="1" /><circle cx="10" cy="10" r="1" /><circle cx="16" cy="10" r="1" /></svg>
              </button>
            </div>

            <div className="conversation" aria-live="polite">
              {chatMessages.length === 0 ? (
                <div className="conversation-empty">
                  <span className="conversation-empty-mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M5 6.75A2.75 2.75 0 0 1 7.75 4h8.5A2.75 2.75 0 0 1 19 6.75v6.5A2.75 2.75 0 0 1 16.25 16H11l-4.5 3v-3.2A2.75 2.75 0 0 1 5 13.25v-6.5Z" /><path d="M9 9h6m-6 3h4" /></svg>
                  </span>
                  <h3>Start a conversation</h3>
                  <p>Your messages will appear here.</p>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div key = {index}>
                    <strong>
                      {message.role === "user" ? "You" : "AI"}
                    </strong>
                    <p>{message.content}</p>
                  </div>
                ))
              )}
            </div>

            <form className="composer" onSubmit={sendMessage}>
              <label className="sr-only" htmlFor="message-input">Write a message</label>
              <textarea
                id="message-input"
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();                   }
                }}
                placeholder="Ask, explore, or just think out loud..."
                rows={2}
                value={chatInput}
              />
              <div className="composer-actions">
                <span className="composer-hint">Enter to send · Shift + Enter for a new line</span>
                <div className="composer-buttons">
                  <button
                  className={`mic-button${isRecording ? ' recording' : ''}`}
                  title={isRecording ? 'Stop recording' : 'Start recording'}
                  type="button"
                  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                  onClick={isRecording ? stopRecording : startRecording}>
                    {isRecording ? (
                      <svg className="stop-icon" viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="6" width="8" height="8" rx="1.5" /></svg>
                    ) : (
                      <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="3" width="6" height="10" rx="3" /><path d="M4.8 9.5a5.2 5.2 0 0 0 10.4 0M10 15v2m-3 0h6" /></svg>
                    )}
                  </button>
                  <button className="send-button" 
                   type="submit" 
                   aria-label="Send message"
                   onClick={sendMessage}
                   disabled={isChatLoading || !chatInput.trim()}
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m3 9 14-6-6 14-2-6-6-2Zm6 2 4-4" /></svg>
                  </button>
                </div>
              </div>
            </form>
            <p className="chat-footnote">A quiet space for your next good question.</p>
          </section>
        </div>
      </div>
    </main>
  );
}