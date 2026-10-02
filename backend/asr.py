from faster_whisper import WhisperModel


"""
audio file -> HHTP post /transcribe --> fastapi -> whisper -> json responses 
"""
MODEL_SIZE = "base"
MODEL = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")


def transcribe_audio(audio_path: str) -> str:
    segments, _info = MODEL.transcribe(audio_path, beam_size=5)
    transcript = " ".join(segment.text.strip() for segment in segments if segment.text.strip())
    return transcript