"""
ชั้น C — ปากที่คุยสัมภาษณ์

ทำเป็น interface กลางแล้วมี 3 backend เพราะเหตุผลเดียว: **demo day เน็ตล่มได้**
ถ้าผูกกับ Typhoon API อย่างเดียวแล้ววันงานเน็ตมีปัญหา = จบเห่
สลับ provider ได้ด้วยการแก้ LLM_PROVIDER ใน .env ตัวเดียว ไม่ต้องแก้โค้ด
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class Message:
    role: str  # system | user | assistant
    content: str


class LLMProvider(ABC):
    """สัญญาที่ทุก backend ต้องทำได้"""

    name: str = "base"
    model: str = ""

    @abstractmethod
    async def chat(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 800,
    ) -> str:
        """ส่งบทสนทนาเข้าไป ได้ข้อความตอบกลับ"""

    @abstractmethod
    async def healthy(self) -> bool:
        """เช็คก่อนขึ้นเวทีว่า provider นี้ยังตอบอยู่ไหม"""


def build_provider(settings) -> LLMProvider:
    """เลือก backend ตาม .env — import แบบ lazy เพราะ hf_local ลาก torch มาหนักมาก"""
    provider = settings.llm_provider

    if provider == "typhoon_api":
        from .typhoon_api import TyphoonAPIProvider

        return TyphoonAPIProvider(
            api_key=settings.typhoon_api_key,
            base_url=settings.typhoon_base_url,
            model=settings.typhoon_model,
        )

    if provider == "ollama":
        from .typhoon_api import TyphoonAPIProvider

        # Ollama เปิด endpoint แบบ OpenAI-compatible เหมือนกัน ใช้ client ตัวเดียวกันได้
        return TyphoonAPIProvider(
            api_key="ollama",  # Ollama ไม่เช็ค key แต่ client ต้องการค่าอะไรสักอย่าง
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            label="ollama",
        )

    if provider == "hf_local":
        from .typhoon_local import TyphoonLocalProvider

        return TyphoonLocalProvider(
            model_id=settings.hf_local_model,
            adapter_path=settings.hf_lora_adapter or None,
            load_4bit=settings.hf_load_4bit,
        )

    raise ValueError(f"ไม่รู้จัก LLM_PROVIDER: {provider}")
