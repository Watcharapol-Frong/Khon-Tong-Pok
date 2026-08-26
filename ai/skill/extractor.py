"""
ชั้น A — WangchanBERTa: สมองที่อ่านเรซูเม่แล้วชี้ว่าตรงไหนคือทักษะ

งานนี้คือ token classification แบบ BIO ตามแนว SkillSpan (NAACL 2022):

    "ผม   เขียน  Python  ดูแล  stock  ให้ร้าน"
     O     B-SKILL I-SKILL B-SKILL I-SKILL O

ทำไมต้องเป็น span ไม่ใช่ classification ทั้งประโยค:
ทักษะจริงในเรซูเม่ไทยมักเป็นวลีสั้น ๆ ที่ฝังอยู่กลางประโยค และเราต้องรู้
"ตำแหน่งตัวอักษร" ของมันเพื่อไฮไลต์กลับไปที่ต้นฉบับได้ — ซึ่งคือ demo moment
ที่พิสูจน์คำว่า "ตรงปก" ให้กรรมการเห็นกับตา

หมายเหตุ: ก่อน fine-tune เสร็จ โมเดล base จะไม่มี classification head ที่เทรนแล้ว
คลาสนี้จะยังโหลดได้และคืนผลว่าง ๆ พร้อม warning แทนที่จะพัง — เพื่อให้ทีมต่อ API
ได้ก่อนโดยไม่ต้องรอ dataset
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

log = logging.getLogger(__name__)

# ป้ายที่ใช้ — ตาม SkillSpan
#   SKILL = ทักษะ/การกระทำ ("ดูแล stock", "เขียน unit test")
#   KNOW  = ความรู้/เครื่องมือ ("Python", "กฎหมายแรงงาน")
LABELS = ["O", "B-SKILL", "I-SKILL", "B-KNOW", "I-KNOW"]
LABEL2ID = {label: i for i, label in enumerate(LABELS)}
ID2LABEL = dict(enumerate(LABELS))

# model card ของ att-spm-uncased ระบุ sequence length ปลอดภัยที่ 416
MAX_LEN = 416
STRIDE = 64


@dataclass
class SkillSpan:
    """หนึ่งทักษะที่สกัดได้ พร้อมพิกัดกลับไปหาต้นฉบับ"""

    surface_text: str
    label: str  # SKILL | KNOW
    char_start: int
    char_end: int
    confidence: float

    def to_dict(self) -> dict:
        return {
            "surface_text": self.surface_text,
            "label": self.label,
            "char_start": self.char_start,
            "char_end": self.char_end,
            "confidence": round(self.confidence, 4),
        }


@dataclass
class ExtractionResult:
    spans: list[SkillSpan] = field(default_factory=list)
    model_version: str = ""
    trained: bool = False
    note: str = ""


def normalize_thai(text: str) -> str:
    """
    WangchanBERTa เป็น uncased และเทรนบนข้อความที่ผ่านการทำความสะอาดมาแล้ว
    ถ้าป้อนข้อความดิบจาก PDF เข้าไปตรง ๆ จะเจอ soft hyphen / zero-width /
    วรรณยุกต์ซ้ำ ซึ่งทำให้ tokenizer แตกคำผิด

    สำคัญ: ฟังก์ชันนี้ต้องรักษา "ความยาวตัวอักษร" ไว้ให้ตรงกับต้นฉบับเสมอ
    ไม่งั้น char_start/char_end จะชี้ผิดตำแหน่ง — เลยแทนที่ด้วยช่องว่าง
    แทนที่จะลบทิ้ง
    """
    text = text.replace("­", " ")  # soft hyphen
    text = text.replace("​", " ")  # zero-width space
    text = text.replace("﻿", " ")  # BOM
    return text


class SkillExtractor:
    def __init__(
        self,
        model_path: str,
        model_version: str = "unknown",
        threshold: float = 0.60,
    ) -> None:
        self.model_path = model_path
        self.model_version = model_version
        self.threshold = threshold
        self._tokenizer = None
        self._model = None
        self._trained = False

    # ------------------------------------------------------------------
    def load(self) -> None:
        """โหลดครั้งเดียว ตอนเรียกใช้จริง — ไม่ใช่ตอน import"""
        if self._model is not None:
            return

        import torch
        from transformers import AutoModelForTokenClassification, AutoTokenizer

        log.info("โหลด skill extractor จาก %s", self.model_path)
        self._tokenizer = AutoTokenizer.from_pretrained(self.model_path)

        self._model = AutoModelForTokenClassification.from_pretrained(
            self.model_path,
            num_labels=len(LABELS),
            id2label=ID2LABEL,
            label2id=LABEL2ID,
        )
        self._model.eval()
        self._torch = torch

        # base model ที่ยังไม่ fine-tune จะมี head ที่ init แบบสุ่ม
        # เดาจาก config: ถ้า id2label ของ checkpoint ไม่ตรงกับของเรา แปลว่ายังไม่เทรน
        cfg_labels = getattr(self._model.config, "id2label", {})
        self._trained = set(cfg_labels.values()) == set(LABELS) and (
            "untrained" not in self.model_version
        )

        if not self._trained:
            log.warning(
                "โมเดลที่โหลดยังไม่ได้ fine-tune (version=%s) — "
                "จะคืนผลว่างจนกว่าจะเทรนเสร็จ ดู train/train_skill_ner.py",
                self.model_version,
            )

    # ------------------------------------------------------------------
    def extract(self, text: str) -> ExtractionResult:
        self.load()

        if not self._trained:
            return ExtractionResult(
                spans=[],
                model_version=self.model_version,
                trained=False,
                note=(
                    "ยังไม่ได้ fine-tune — รัน train/train_skill_ner.py "
                    "แล้วชี้ SKILL_MODEL_PATH ไปที่ ./models/skill-ner-v1"
                ),
            )

        text = normalize_thai(text)
        spans: list[SkillSpan] = []

        for chunk_start, chunk in self._chunks(text):
            spans.extend(self._extract_chunk(chunk, offset=chunk_start))

        spans = self._dedupe(spans)
        spans = [s for s in spans if s.confidence >= self.threshold]

        return ExtractionResult(
            spans=spans, model_version=self.model_version, trained=True
        )

    # ------------------------------------------------------------------
    def _chunks(self, text: str) -> list[tuple[int, str]]:
        """
        ตัดข้อความยาวเป็นท่อน ๆ ตามขอบเขตประโยค
        เรซูเม่ 2 หน้ายาวเกิน 416 token แน่นอน ถ้าไม่ตัดจะโดน truncate เงียบ ๆ
        แล้วทักษะครึ่งหลังหายหมดโดยไม่มี error
        """
        if len(text) <= 1200:
            return [(0, text)]

        out: list[tuple[int, str]] = []
        # ตัดที่ขึ้นบรรทัดใหม่หรือ bullet — เรซูเม่มีเยอะอยู่แล้ว
        pieces = [m for m in re.finditer(r"[^\n\r•·▪]+", text) if m.group().strip()]

        buf, buf_start = "", 0
        for m in pieces:
            if not buf:
                buf_start = m.start()
            if len(buf) + len(m.group()) > 1200:
                out.append((buf_start, buf))
                buf, buf_start = m.group(), m.start()
            else:
                # เติม padding ให้ offset ตรงกับต้นฉบับเป๊ะ
                gap = m.start() - (buf_start + len(buf))
                buf += " " * max(gap, 0) + m.group()
        if buf:
            out.append((buf_start, buf))
        return out

    # ------------------------------------------------------------------
    def _extract_chunk(self, text: str, offset: int) -> list[SkillSpan]:
        torch = self._torch
        enc = self._tokenizer(
            text,
            return_offsets_mapping=True,
            return_tensors="pt",
            truncation=True,
            max_length=MAX_LEN,
        )
        offsets = enc.pop("offset_mapping")[0].tolist()

        with torch.no_grad():
            logits = self._model(**enc).logits[0]

        probs = torch.softmax(logits, dim=-1)
        conf, pred = probs.max(dim=-1)

        return self._decode_bio(
            text=text,
            offsets=offsets,
            pred=pred.tolist(),
            conf=conf.tolist(),
            base_offset=offset,
        )

    # ------------------------------------------------------------------
    def _decode_bio(
        self,
        text: str,
        offsets: list[list[int]],
        pred: list[int],
        conf: list[float],
        base_offset: int,
    ) -> list[SkillSpan]:
        """รวม token ที่ต่อเนื่องกันให้เป็น span เดียว"""
        spans: list[SkillSpan] = []
        cur_label: str | None = None
        cur_start = cur_end = 0
        cur_conf: list[float] = []

        def flush() -> None:
            nonlocal cur_label
            if cur_label is None:
                return
            surface = text[cur_start:cur_end].strip()
            if surface:
                spans.append(
                    SkillSpan(
                        surface_text=surface,
                        label=cur_label,
                        char_start=base_offset + cur_start,
                        char_end=base_offset + cur_start + len(surface),
                        confidence=sum(cur_conf) / len(cur_conf),
                    )
                )
            cur_label = None

        for (start, end), pid, c in zip(offsets, pred, conf, strict=False):
            if start == end:  # special token (<s>, </s>, <pad>)
                continue
            tag = ID2LABEL[pid]

            if tag == "O":
                flush()
                cur_conf = []
                continue

            prefix, label = tag.split("-", 1)
            if prefix == "B" or cur_label != label:
                flush()
                cur_label, cur_start, cur_end, cur_conf = label, start, end, [c]
            else:
                cur_end = end
                cur_conf.append(c)

        flush()
        return spans

    # ------------------------------------------------------------------
    @staticmethod
    def _dedupe(spans: list[SkillSpan]) -> list[SkillSpan]:
        """ท่อนที่ตัดมาอาจซ้อนกัน — เก็บอันที่ confidence สูงกว่า"""
        best: dict[tuple[int, int], SkillSpan] = {}
        for s in spans:
            key = (s.char_start, s.char_end)
            if key not in best or s.confidence > best[key].confidence:
                best[key] = s
        return sorted(best.values(), key=lambda s: s.char_start)
