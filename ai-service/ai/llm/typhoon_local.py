"""
Typhoon 2.5 รันในเครื่องด้วย transformers

ใช้เมื่อ: มี GPU และอยากพิสูจน์ให้กรรมการเห็นว่า "เรารันโมเดลเองได้ ไม่ได้พึ่ง API ใคร"
scb10x/typhoon2.5-qwen3-4b = 4B params ฐาน Qwen3, context 256k, รองรับ function calling
บน CPU ล้วนจะช้ามาก (นาทีต่อคำตอบ) — ถ้าไม่มี GPU ให้ใช้ Ollama GGUF แทน
"""

from __future__ import annotations

import asyncio
import logging

from .base import LLMProvider, Message

log = logging.getLogger(__name__)


class TyphoonLocalProvider(LLMProvider):
    def __init__(
        self,
        model_id: str,
        adapter_path: str | None = None,
        load_4bit: bool = True,
    ) -> None:
        self.name = "hf_local" + ("+lora" if adapter_path else "")
        self.model = model_id
        self.adapter_path = adapter_path
        self.load_4bit = load_4bit
        self._tokenizer = None
        self._model = None

    def _load(self) -> None:
        """โหลดครั้งเดียวตอนเรียกใช้จริง ไม่ใช่ตอน import"""
        if self._model is not None:
            return

        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        has_cuda = torch.cuda.is_available()
        log.info("กำลังโหลด %s ... (ครั้งแรกจะดาวน์โหลดหลาย GB)", self.model)

        # ถ้ามี adapter ให้ใช้ tokenizer ที่บันทึกคู่มากับมัน จะได้ chat template ตรงกับตอนเทรน
        self._tokenizer = AutoTokenizer.from_pretrained(self.adapter_path or self.model)

        quant = None
        if self.load_4bit and has_cuda:
            from transformers import BitsAndBytesConfig

            quant = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
                bnb_4bit_use_double_quant=True,
            )

        self._model = AutoModelForCausalLM.from_pretrained(
            self.model,
            quantization_config=quant,
            torch_dtype=torch.bfloat16 if has_cuda else torch.float32,
            device_map={"": 0} if has_cuda else None,
        )

        if self.adapter_path:
            from peft import PeftModel

            log.info("ต่อ LoRA adapter จาก %s", self.adapter_path)
            self._model = PeftModel.from_pretrained(self._model, self.adapter_path)

        self._model.eval()
        log.info("โหลดเสร็จแล้ว (cuda=%s, 4bit=%s, lora=%s)",
                 has_cuda, quant is not None, bool(self.adapter_path))

    def _generate_sync(
        self, messages: list[Message], temperature: float, max_tokens: int
    ) -> str:
        self._load()
        assert self._tokenizer is not None and self._model is not None

        chat = [{"role": m.role, "content": m.content} for m in messages]
        # Qwen3 มีโหมด thinking ติดมาใน template ต้องปิด ไม่งั้นได้ token ขยะปนมาในคำตอบ
        # และต้องปิดให้ตรงกับตอนเทรนด้วย (train/train_interview_lora.py ก็ปิด)
        try:
            prompt = self._tokenizer.apply_chat_template(
                chat, tokenize=False, add_generation_prompt=True, enable_thinking=False
            )
        except TypeError:
            prompt = self._tokenizer.apply_chat_template(
                chat, tokenize=False, add_generation_prompt=True
            )
        inputs = self._tokenizer(prompt, return_tensors="pt").to(self._model.device)

        out = self._model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=max(temperature, 0.01),
            do_sample=temperature > 0,
            pad_token_id=self._tokenizer.eos_token_id,
        )
        generated = out[0][inputs["input_ids"].shape[-1] :]
        return self._tokenizer.decode(generated, skip_special_tokens=True).strip()

    async def chat(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int = 800,
    ) -> str:
        # generate() เป็น blocking — โยนออก thread ไม่ให้ค้าง event loop ของ FastAPI
        return await asyncio.to_thread(
            self._generate_sync, messages, temperature, max_tokens
        )

    async def healthy(self) -> bool:
        try:
            await self.chat(
                [Message(role="user", content="ตอบว่า ok")],
                temperature=0.0,
                max_tokens=8,
            )
            return True
        except Exception as exc:  # noqa: BLE001
            log.warning("[hf_local] health check ไม่ผ่าน: %s", exc)
            return False
