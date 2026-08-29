"""ค่า config ทั้งหมดอ่านจาก .env ที่เดียว — ห้าม hardcode key ไว้ในโค้ด"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ---------- ชั้น C: generative LLM ----------
    llm_provider: Literal["typhoon_api", "ollama", "hf_local"] = "typhoon_api"

    typhoon_api_key: str = ""
    typhoon_base_url: str = "https://api.opentyphoon.ai/v1"
    typhoon_model: str = "typhoon-v2.5-30b-a3b-instruct"

    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "hf.co/scb10x/typhoon2.5-qwen3-4b-gguf"

    hf_local_model: str = "scb10x/typhoon2.5-qwen3-4b"
    # LoRA adapter ที่ fine-tune เอง — เว้นว่าง = ใช้ base ล้วน
    # ตั้งค่านี้ก็ต่อเมื่อ eval_interview.py บอกว่ามันชนะ base + prompt แล้วเท่านั้น
    hf_lora_adapter: str = ""
    # โหลดแบบ 4-bit ให้พอดีกับการ์ดจอเล็ก (RTX 4050 6GB รันได้)
    hf_load_4bit: bool = True

    # ---------- ชั้น A: WangchanBERTa ----------
    skill_model_path: str = "airesearch/wangchanberta-base-att-spm-uncased"
    skill_model_version: str = "base-untrained"
    skill_confidence_threshold: float = 0.60

    # ---------- OCR (ใช้ TYPHOON_API_KEY ตัวเดียวกับชั้น C) ----------
    # ไม่มี key ก็ยังใช้งานได้ แค่ตกไปใช้ Tesseract ซึ่งพังกับตาราง/สองคอลัมน์
    typhoon_ocr_model: str = "typhoon-ocr"
    typhoon_ocr_base_url: str = "https://api.opentyphoon.ai/v1"
    # จำกัดหน้าไว้เพราะโควตาคือ 20 req/min และ 1 หน้า = 1 request
    # เรซูเม่จริงแทบไม่เกิน 2 หน้า ถ้าใครส่ง portfolio 30 หน้ามาจะดูดโควตาหมดคนเดียว
    typhoon_ocr_max_pages: int = 4

    # ---------- เสียง (ASR) ----------
    # "browser" = ให้ Web Speech API ของเบราว์เซอร์ทำ ไม่มีอะไรวิ่งผ่าน server
    # เปลี่ยนเป็น local_whisper ต่อเมื่อจำเป็นต้องรองรับ Firefox/Safari
    asr_provider: Literal["browser", "local_whisper", "openai_compatible"] = "browser"
    asr_model: str = "small"
    asr_base_url: str = ""
    asr_api_key: str = ""

    # ---------- อัปโหลด ----------
    max_upload_mb: int = 10
    # ปิดได้ถ้าต้องการให้ทุกอย่างอยู่ในเครื่อง (เช่นตอนสาธิตแบบไม่มีเน็ต)
    ocr_enabled: bool = True

    # ---------- infra ----------
    database_url: str = ""
    # 3000 คือ Next.js ซึ่งเป็นเว็บจริงของเรา — เดิมตั้งไว้แค่ 5173 (Vite)
    # ทำให้เบราว์เซอร์บล็อกทุก request จากหน้าเว็บด้วย CORS ตั้งแต่ก่อนถึง handler
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    tesseract_cmd: str = ""

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
