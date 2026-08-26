"""
Typhoon ผ่าน HTTP (OpenAI-compatible)

ใช้ได้ทั้ง 2 กรณีด้วยคลาสเดียว เพราะ endpoint หน้าตาเหมือนกัน:
  - Typhoon API  : https://api.opentyphoon.ai/v1  model=typhoon-v2.5-30b-a3b-instruct
  - Ollama local : http://localhost:11434/v1      model=hf.co/scb10x/typhoon2.5-qwen3-4b-gguf
"""

from __future__ import annotations

import logging

from openai import APIError, AsyncOpenAI

from .base import LLMProvider, Message

log = logging.getLogger(__name__)


class TyphoonAPIProvider(LLMProvider):
    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        label: str = "typhoon_api",
    ) -> None:
        if not api_key:
            raise ValueError(
                "ยังไม่ได้ตั้ง TYPHOON_API_KEY — ขอ key ฟรีที่ https://opentyphoon.ai "
                "หรือเปลี่ยน LLM_PROVIDER=ollama ถ้าจะรันในเครื่อง"
            )
        self.name = label
        self.model = model
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=60.0,
            max_retries=2,
        )

    async def chat(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 800,
    ) -> str:
        try:
            resp = await self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": m.role, "content": m.content} for m in messages],
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except APIError as exc:
            log.error("[%s] เรียกโมเดลไม่สำเร็จ: %s", self.name, exc)
            raise

        content = resp.choices[0].message.content
        return (content or "").strip()

    async def healthy(self) -> bool:
        """warm-up ก่อนขึ้นเวที — เรียกอันนี้ 10 นาทีก่อน demo"""
        try:
            await self.chat(
                [Message(role="user", content="ตอบว่า ok")],
                temperature=0.0,
                max_tokens=8,
            )
            return True
        except Exception as exc:  # noqa: BLE001 — health check ต้องไม่โยน error ออกไป
            log.warning("[%s] health check ไม่ผ่าน: %s", self.name, exc)
            return False
