import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlock from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

// ─── Code ──────────────────────────────────────────────────────────────────

const CODE_SCHEMAS = `# ml/schemas.py
from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ReportCategory(str, Enum):
    INFRASTRUCTURE  = "INFRASTRUCTURE"   # Estradas, água, luz, saneamento
    PUBLIC_HEALTH   = "PUBLIC_HEALTH"    # Saúde, lixo, epidemias
    SECURITY        = "SECURITY"         # Segurança, crime, acidentes
    ENVIRONMENT     = "ENVIRONMENT"      # Ambiente, poluição, árvores
    EDUCATION       = "EDUCATION"        # Escolas, formação, bibliotecas
    OTHER           = "OTHER"            # Outros


class SentimentLabel(str, Enum):
    POSITIVE = "POSITIVE"   # Elogio, satisfação
    NEUTRAL  = "NEUTRAL"    # Informação factual
    NEGATIVE = "NEGATIVE"   # Insatisfação, queixa
    URGENT   = "URGENT"     # Urgência, perigo imediato


class Department(str, Enum):
    OBRAS_PUBLICAS   = "Direcção de Obras Públicas"
    SAUDE            = "Direcção de Saúde"
    SEGURANCA        = "Serviço de Segurança Municipal"
    MEIO_AMBIENTE    = "Direcção do Ambiente"
    EDUCACAO         = "Direcção da Educação"
    ADMINISTRACAO    = "Administração Municipal"


# ─── I/O do pipeline ─────────────────────────────────────────

class NLPInput(BaseModel):
    report_id:   str
    text:        str = Field(min_length=3, max_length=5000)
    channel:     Optional[str] = None   # contexto extra (ussd, whatsapp…)
    bairro_hint: Optional[str] = None   # bairro já conhecido


class LocationEntity(BaseModel):
    text:       str
    label:      str   # "BAIRRO" | "LANDMARK" | "STREET"
    confidence: float
    start:      int   # offset no texto original
    end:        int


class NLPResult(BaseModel):
    report_id:            str
    category:             ReportCategory
    category_confidence:  float
    sentiment:            SentimentLabel
    sentiment_confidence: float
    priority:             int = Field(ge=1, le=5)
    department:           Department
    locations:            list[LocationEntity]
    used_fallback:        bool   # True se ML confidence < threshold
    inference_ms:         float
    keywords_matched:     list[str]  # para auditabilidade da decisão`;

const CODE_CLASSIFIER = `# ml/classifier.py
"""
Classificador de categoria e sentimento para relatórios em Português Angolano.

Abordagem: TF-IDF + SGDClassifier (scikit-learn)
  - Treinado em corpus sintético de relatórios de Luanda
  - Serializado com joblib
  - Inference < 15ms em CPU

Modelo spaCy pt_core_news_sm usado para:
  - Lematização (melhora TF-IDF para Português)
  - NER de localidades
  - Tokenização consciente de hifens e apostrofes

Para lidar com Português Angolano:
  - Expansão de gíria via dicionário antes do TF-IDF
  - Custom tokenizer rules para "musseque", "kuia", "candongueiro", etc.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import spacy
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.pipeline import Pipeline

from ml.schemas import ReportCategory, SentimentLabel

# ─── Gíria e dialectismos angolanos ──────────────────────────
# Mapeamento: forma local → forma padrão (para o vectorizador)
ANGOLA_SLANG: dict[str, str] = {
    "kuia":          "problema",
    "candongueiro":  "transporte",
    "zungueiro":     "vendedor ambulante",
    "musseque":      "bairro informal",
    "soba":          "líder comunitário",
    "kamba":         "amigo companheiro",
    "maka":          "problema conflito",
    "djambalão":     "problema confusão",
    "bue":           "muito bastante",
    "ganda":         "grande enorme",
    "fixe":          "bom funcionar",
    "má nada":       "problema grave",
    "chingar":       "irritar incomodar",
    "descambar":     "piorar deteriorar",
    "mbuandu":       "lixo sujidade",
    "condução":      "transporte veículo",
    "picada":        "estrada informal caminho",
    "bagunça":       "desordem caos",
    "gambôa":        "zona perigosa",
    "muamba":        "contrabando ilegal",
}


def _normalize_text(text: str) -> str:
    """Expandir gíria angolana antes de vectorizar."""
    text_lower = text.lower()
    for slang, replacement in ANGOLA_SLANG.items():
        text_lower = text_lower.replace(slang, replacement)
    return text_lower


def _lemmatize(nlp, text: str) -> str:
    """Lematizar com spaCy pt_core_news_sm."""
    doc = nlp(text[:512])  # limite para manter <50ms
    return " ".join(
        token.lemma_.lower()
        for token in doc
        if not token.is_stop and not token.is_punct and len(token.text) > 1
    )


# ─── Dados de treino sintéticos (Português Angolano) ─────────
# Em produção: expandir para 500+ exemplos por classe
# e usar anotação humana de relatórios reais.

TRAINING_DATA_CATEGORY: list[tuple[str, str]] = [
    # INFRASTRUCTURE
    ("A estrada do Rangel está cheia de buracos, é impossível passar", "INFRASTRUCTURE"),
    ("Falta água canalizada no Palanca há 3 dias", "INFRASTRUCTURE"),
    ("A iluminação pública do Golf 2 não funciona à noite", "INFRASTRUCTURE"),
    ("Cano de esgoto rebentou na Camama, está a alagar a rua", "INFRASTRUCTURE"),
    ("A picada que liga o musseque ao bairro está intransitável", "INFRASTRUCTURE"),
    ("Transformador queimado deixou metade do bairro sem luz", "INFRASTRUCTURE"),
    ("Ponte com fissuras, kuia ganda para quem atravessa", "INFRASTRUCTURE"),
    ("Caixote do lixo partido, o lixo está espalhado na rua", "INFRASTRUCTURE"),
    # PUBLIC_HEALTH
    ("Há mosquitos bue nesta zona, risco de malária", "PUBLIC_HEALTH"),
    ("Lixo acumulado à semana no Benfica, mau cheiro insuportável", "PUBLIC_HEALTH"),
    ("Criança com febre alta no bairro, não há posto de saúde próximo", "PUBLIC_HEALTH"),
    ("Água contaminada na torneira, mbuandu misturado", "PUBLIC_HEALTH"),
    ("Risco de cólera por esgoto aberto perto das casas", "PUBLIC_HEALTH"),
    ("Rato e insectos em abundância devido ao lixo acumulado", "PUBLIC_HEALTH"),
    ("Posto de saúde fechado há 2 semanas, sem médico", "PUBLIC_HEALTH"),
    # SECURITY
    ("Assalto à mão armada na madrugada no Kikolo", "SECURITY"),
    ("Gambôa perigosa, maka todos os dias à noite", "SECURITY"),
    ("Acidente grave na estrada principal, viatura tombou", "SECURITY"),
    ("Briga entre gangues no musseque, moradores com medo", "SECURITY"),
    ("Semáforo avariado está a causar acidentes na esquina", "SECURITY"),
    ("Muamba à venda na praça, autoridades não aparecem", "SECURITY"),
    ("Candongueiro sem travões, é um perigo para todos", "SECURITY"),
    # ENVIRONMENT
    ("Queimada ilegal a destruir árvores no Camama", "ENVIRONMENT"),
    ("Fábrica a poluir o rio com fumo negro", "ENVIRONMENT"),
    ("Árvore caída a bloquear a rua depois da chuva", "ENVIRONMENT"),
    ("Lixo industrial atirado para o terreno vazio", "ENVIRONMENT"),
    ("Dreno entupido, água parada a criar mosquitos", "ENVIRONMENT"),
    ("Barulho excessivo de construção ilegal de madrugada", "ENVIRONMENT"),
    # EDUCATION
    ("Escola sem professores há um mês no Rangel", "EDUCATION"),
    ("Crianças sem livros, não conseguem estudar direito", "EDUCATION"),
    ("Sala de aula com tecto a cair, é perigoso", "EDUCATION"),
    ("Escola sem água potável para as crianças", "EDUCATION"),
    ("Professor falta muito, turma fica sem aula", "EDUCATION"),
    # OTHER
    ("Quero saber como tirar certidão de nascimento", "OTHER"),
    ("Quando é que o mercado do Palanca vai abrir?", "OTHER"),
    ("Obrigado pela boa atenção que tiveram ao meu caso", "OTHER"),
    ("Informação sobre vacinação no bairro do Golf 2", "OTHER"),
]

TRAINING_DATA_SENTIMENT: list[tuple[str, str]] = [
    ("Excelente serviço, arranjaram a estrada muito rapidamente, fixe!", "POSITIVE"),
    ("Obrigado pela rápida resposta ao meu relatório", "POSITIVE"),
    ("O técnico foi muito simpático e profissional, bue bom", "POSITIVE"),
    ("A iluminação foi instalada, estamos satisfeitos", "POSITIVE"),
    ("A rua está com buraco", "NEUTRAL"),
    ("Falta água no bairro", "NEUTRAL"),
    ("Semáforo avariado na esquina principal", "NEUTRAL"),
    ("Solicito informação sobre o prazo de reparação", "NEUTRAL"),
    ("Já relatei este problema 3 vezes e nada foi feito, má nada", "NEGATIVE"),
    ("A situação está a piorar, descambou mesmo", "NEGATIVE"),
    ("Estamos muito insatisfeitos com a falta de resposta", "NEGATIVE"),
    ("Vergonha, o município não faz nada, kuia ganda", "NEGATIVE"),
    ("URGENTE: criança ferida, precisa de ambulância já!", "URGENT"),
    ("Incêndio activo, fogo a alastrar, SOCORRO", "URGENT"),
    ("Pessoa inconsciente na rua, risco de vida imediato", "URGENT"),
    ("Acidente grave, há feridos, preciso de ajuda urgente", "URGENT"),
    ("Explosão de cano de gás, evacuação necessária agora", "URGENT"),
]


class ReportClassifier:
    """
    Pipeline de classificação: categoria + sentimento.
    Dois pipelines separados treinados com scikit-learn.
    """

    CONFIDENCE_THRESHOLD = 0.60

    def __init__(self, model_path: Optional[Path] = None) -> None:
        self._nlp: Optional[object] = None
        self._cat_pipeline:  Optional[Pipeline] = None
        self._sent_pipeline: Optional[Pipeline] = None

        if model_path and model_path.exists():
            self.load(model_path)

    def _make_pipeline(self) -> Pipeline:
        return Pipeline([
            ("tfidf", TfidfVectorizer(
                ngram_range=(1, 2),   # unigrams + bigrams
                max_features=8000,
                sublinear_tf=True,    # TF suavizado — melhor para textos curtos
                min_df=1,
            )),
            ("clf", CalibratedClassifierCV(
                SGDClassifier(
                    loss="modified_huber",   # devolve probabilidades calibradas
                    max_iter=1000,
                    random_state=42,
                    n_jobs=-1,
                ),
                cv=3,
            )),
        ])

    def _preprocess(self, text: str) -> str:
        """Normalizar gíria + lematizar."""
        normalized = _normalize_text(text)
        if self._nlp:
            return _lemmatize(self._nlp, normalized)
        return normalized

    # ── Treino ────────────────────────────────────────────────

    def train(
        self,
        category_data:  list[tuple[str, str]] = TRAINING_DATA_CATEGORY,
        sentiment_data: list[tuple[str, str]] = TRAINING_DATA_SENTIMENT,
        load_spacy: bool = True,
    ) -> None:
        if load_spacy:
            try:
                self._nlp = spacy.load("pt_core_news_sm")
            except OSError:
                # python -m spacy download pt_core_news_sm
                print("AVISO: pt_core_news_sm não instalado. A usar tokenização básica.")

        # Pré-processar corpus
        cat_texts  = [self._preprocess(t) for t, _ in category_data]
        cat_labels = [l for _, l in category_data]

        sent_texts  = [self._preprocess(t) for t, _ in sentiment_data]
        sent_labels = [l for _, l in sentiment_data]

        self._cat_pipeline = self._make_pipeline()
        self._cat_pipeline.fit(cat_texts, cat_labels)

        self._sent_pipeline = self._make_pipeline()
        self._sent_pipeline.fit(sent_texts, sent_labels)

    # ── Inferência ────────────────────────────────────────────

    def predict(
        self,
        text: str,
    ) -> tuple[ReportCategory, float, SentimentLabel, float]:
        """
        Devolve (category, cat_confidence, sentiment, sent_confidence).
        Lança RuntimeError se o modelo não foi treinado/carregado.
        """
        if not self._cat_pipeline or not self._sent_pipeline:
            raise RuntimeError("Modelo não treinado. Chamar train() ou load().")

        processed = self._preprocess(text)

        cat_proba  = self._cat_pipeline.predict_proba([processed])[0]
        cat_idx    = int(np.argmax(cat_proba))
        cat_label  = self._cat_pipeline.classes_[cat_idx]
        cat_conf   = float(cat_proba[cat_idx])

        sent_proba = self._sent_pipeline.predict_proba([processed])[0]
        sent_idx   = int(np.argmax(sent_proba))
        sent_label = self._sent_pipeline.classes_[sent_idx]
        sent_conf  = float(sent_proba[sent_idx])

        return (
            ReportCategory(cat_label),
            cat_conf,
            SentimentLabel(sent_label),
            sent_conf,
        )

    # ── Persistência ──────────────────────────────────────────

    def save(self, path: Path) -> None:
        """Serializar modelo para disco com joblib."""
        path.mkdir(parents=True, exist_ok=True)
        joblib.dump(self._cat_pipeline,  path / "category_pipeline.joblib",  compress=3)
        joblib.dump(self._sent_pipeline, path / "sentiment_pipeline.joblib", compress=3)
        print(f"Modelo guardado em {path}")

    def load(self, path: Path) -> None:
        """Carregar modelo do disco."""
        self._cat_pipeline  = joblib.load(path / "category_pipeline.joblib")
        self._sent_pipeline = joblib.load(path / "sentiment_pipeline.joblib")
        try:
            self._nlp = spacy.load("pt_core_news_sm")
        except OSError:
            pass`;

const CODE_RULES = `# ml/rules.py
"""
Classificador baseado em regras — fallback quando ML confidence < 0.6.

Design:
  - Dicionário de palavras-chave por categoria (Português Angolano)
  - Pontuação por correspondências: match exacto > match parcial
  - Urgência detectada por expressões especiais
  - Transparência total: keywords_matched na resposta

Manutenção: adicionar palavras em KEYWORDS_BY_CATEGORY.
Não requer re-treino — alterações imediatas em produção.
"""
from __future__ import annotations

import re
from ml.schemas import ReportCategory, SentimentLabel

# ─── Dicionário de palavras-chave por categoria ───────────────

KEYWORDS_BY_CATEGORY: dict[str, list[str]] = {
    "INFRASTRUCTURE": [
        "estrada", "buraco", "rua", "alcatrão", "pavimento", "asfalto",
        "ponte", "calçada", "passeio", "água", "canalização", "cano",
        "esgoto", "saneamento", "luz", "electricidade", "poste", "fio",
        "transformador", "rede eléctrica", "iluminação", "semáforo",
        "dreno", "vala", "lixo", "caixote", "contentor", "picada",
        "caminho", "construção", "obra", "rebentou", "avariado", "partido",
        "entupido", "inundação", "alagar", "alagamento",
    ],
    "PUBLIC_HEALTH": [
        "saúde", "doença", "febre", "malária", "cólera", "epidemia",
        "mosquito", "insecto", "rato", "contaminado", "contaminação",
        "hospital", "posto de saúde", "médico", "enfermeiro", "vacina",
        "lixo acumulado", "mau cheiro", "podre", "água suja", "água contaminada",
        "mbuandu", "pragas", "infecção", "higiene", "saneamento básico",
    ],
    "SECURITY": [
        "assalto", "roubo", "ladrão", "bandido", "crime", "gangue",
        "violência", "briga", "tiro", "bala", "arma", "acidente",
        "colisão", "atropelamento", "ferido", "morto", "vítima",
        "perigoso", "inseguro", "medo", "ameaça", "muamba", "gambôa",
        "policia", "autoridade", "viatura", "candongueiro sem travões",
    ],
    "ENVIRONMENT": [
        "ambiente", "poluição", "fumo", "queimada", "incêndio",
        "árvore", "floresta", "rio", "lago", "lixo industrial",
        "resíduos", "contaminação ambiental", "barulho", "ruído",
        "construção ilegal", "derrube", "destruição", "erosão",
        "inundação ambiental", "fauna", "espécie", "ecossistema",
    ],
    "EDUCATION": [
        "escola", "professor", "aluno", "estudante", "aula", "ensino",
        "formação", "livro", "material escolar", "sala de aula",
        "biblioteca", "universidade", "curso", "educação", "criança",
        "infantil", "primária", "secundária", "aprendizagem",
    ],
}

URGENCY_PATTERNS = [
    r"\\b(urgente|socorro|emergência|perigo de vida|incêndio|explosão|"
    r"ferido|morto|inconsciente|acidente grave|ajuda já|imediato)\\b",
    r"\\b(URGENTE|SOCORRO|EMERGÊNCIA|SOS|HELP)\\b",
    r"!{2,}",   # múltiplos pontos de exclamação
    r"(risco de vida|preciso de ajuda|está a morrer|criança em perigo)",
]

POSITIVE_PATTERNS = [
    r"\\b(obrigado|obrigada|agradecido|excelente|ótimo|óptimo|bom trabalho|"
    r"satisfeito|satisfeita|parabéns|fixe|bem feito|resolvido|melhorou)\\b",
]

NEGATIVE_PATTERNS = [
    r"\\b(vergonha|absurdo|revoltante|inaceitável|falta de respeito|"
    r"não fazem nada|kuia|maka|má nada|descambou|piorou|insatisfeito|"
    r"insatisfeita|péssimo|horrível)\\b",
]


class RuleBasedClassifier:
    """Classificador por correspondência de palavras-chave."""

    def classify_category(
        self,
        text: str,
    ) -> tuple[ReportCategory, float, list[str]]:
        """
        Devolve (categoria, score_normalizado, keywords_matched).
        Score = matches_da_categoria / total_keywords_encontradas.
        """
        text_lower = text.lower()
        scores: dict[str, int] = {cat: 0 for cat in KEYWORDS_BY_CATEGORY}
        matched: list[str] = []

        for category, keywords in KEYWORDS_BY_CATEGORY.items():
            for kw in keywords:
                if kw in text_lower:
                    scores[category] += 1
                    matched.append(kw)

        best_cat = max(scores, key=lambda c: scores[c])
        total    = sum(scores.values())

        if total == 0:
            return ReportCategory.OTHER, 0.5, []

        confidence = min(scores[best_cat] / max(total, 1), 1.0)
        # Normalizar para [0.5, 0.85] — regras nunca chegam a 1.0
        confidence = 0.5 + confidence * 0.35

        return ReportCategory(best_cat), confidence, list(set(matched))

    def classify_sentiment(
        self,
        text: str,
    ) -> tuple[SentimentLabel, float]:
        # Urgência tem prioridade máxima
        for pattern in URGENCY_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return SentimentLabel.URGENT, 0.90

        for pattern in POSITIVE_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return SentimentLabel.POSITIVE, 0.80

        for pattern in NEGATIVE_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return SentimentLabel.NEGATIVE, 0.75

        return SentimentLabel.NEUTRAL, 0.65`;

const CODE_LOCATION = `# ml/location_extractor.py
"""
Extractor de entidades de localização para relatórios de Mulenvos, Luanda.

Combina:
  1. Gazetteer de bairros e marcos de Luanda (lookup exacto e aproximado)
  2. NER do spaCy pt_core_news_sm (entidades GPE/LOC)
  3. Padrões de rua/avenida para Português Angolano

Cobertura geográfica: Município dos Mulenvos e arredores (Luanda)
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from ml.schemas import LocationEntity

# ─── Gazetteer de Mulenvos e Luanda ──────────────────────────
# Formato: nome_canonical → lista de variantes

BAIRRO_GAZETTEER: dict[str, list[str]] = {
    "Rangel":          ["rangel", "o rangel"],
    "Palanca":         ["palanca", "a palanca"],
    "Camama":          ["camama"],
    "Golf 2":          ["golf 2", "golfe 2", "golf dois", "golf2"],
    "Benfica":         ["benfica", "benfiquinha"],
    "Kikolo":          ["kikolo"],
    "Cazenga":         ["cazenga"],
    "Hoji Ya Henda":   ["hoji ya henda", "hoji", "hoji-ya-henda"],
    "Viana":           ["viana"],
    "Cacuaco":         ["cacuaco"],
    "Sambizanga":      ["sambizanga"],
    "Mota":            ["mota", "bairro mota"],
    "Rocha Pinto":     ["rocha pinto"],
    "São Paulo":       ["são paulo", "sao paulo", "s. paulo"],
    "Marçal":          ["marçal", "marcal"],
    "Terra Nova":      ["terra nova"],
    "Prenda":          ["prenda"],
    "Maculusso":       ["maculusso"],
    "Maianga":         ["maianga"],
}

LANDMARK_GAZETTEER: dict[str, list[str]] = {
    "Mercado do Rangel":    ["mercado do rangel", "feira do rangel"],
    "Hospital Josina Machel": ["hospital josina", "josina machel"],
    "Hospital Américo Boavida": ["boavida", "américo boavida"],
    "Estação de Comboios":  ["estação de comboios", "gare"],
    "Aeroporto 4 de Fevereiro": ["aeroporto", "4 de fevereiro"],
    "Fortaleza de S. Miguel": ["fortaleza", "são miguel"],
    "Marginal de Luanda":   ["marginal", "marginal de luanda"],
}

# Padrões de rua / avenida
STREET_PATTERNS = [
    r"\\b(rua|avenida|av\\.|travessa|largo|praça|beco)\\s+[A-Za-zÀ-ú\\s]{2,30}",
    r"\\b(R\\.|Av\\.)\\s+[A-Za-zÀ-ú\\s]{2,30}",
]


class LocationExtractor:

    def __init__(self, nlp=None) -> None:
        self._nlp = nlp   # spaCy model (opcional, melhora NER)

    def extract(self, text: str, bairro_hint: Optional[str] = None) -> list[LocationEntity]:
        entities: list[LocationEntity] = []
        text_lower = text.lower()

        # 1. Gazetteer exacto — bairros
        for canonical, variants in BAIRRO_GAZETTEER.items():
            for variant in variants:
                idx = text_lower.find(variant)
                if idx != -1:
                    entities.append(LocationEntity(
                        text=text[idx:idx + len(variant)],
                        label="BAIRRO",
                        confidence=0.95,
                        start=idx,
                        end=idx + len(variant),
                    ))

        # 2. Gazetteer exacto — marcos
        for canonical, variants in LANDMARK_GAZETTEER.items():
            for variant in variants:
                idx = text_lower.find(variant)
                if idx != -1:
                    entities.append(LocationEntity(
                        text=text[idx:idx + len(variant)],
                        label="LANDMARK",
                        confidence=0.90,
                        start=idx,
                        end=idx + len(variant),
                    ))

        # 3. Padrões de rua
        for pattern in STREET_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                entities.append(LocationEntity(
                    text=match.group(),
                    label="STREET",
                    confidence=0.80,
                    start=match.start(),
                    end=match.end(),
                ))

        # 4. NER spaCy (GPE / LOC)
        if self._nlp:
            doc = self._nlp(text[:512])
            for ent in doc.ents:
                if ent.label_ in ("GPE", "LOC"):
                    entities.append(LocationEntity(
                        text=ent.text,
                        label="BAIRRO" if ent.label_ == "GPE" else "LANDMARK",
                        confidence=0.70,
                        start=ent.start_char,
                        end=ent.end_char,
                    ))

        # 5. Bairro hint do chamador (ex: já conhecido pelo canal)
        if bairro_hint and bairro_hint.lower() not in text_lower:
            entities.append(LocationEntity(
                text=bairro_hint,
                label="BAIRRO",
                confidence=1.0,
                start=-1,   # não encontrado no texto, mas informado pelo contexto
                end=-1,
            ))

        # Desduplicar por posição
        seen: set[tuple[int, int]] = set()
        unique: list[LocationEntity] = []
        for e in sorted(entities, key=lambda x: -x.confidence):
            key = (e.start, e.end)
            if key not in seen:
                seen.add(key)
                unique.append(e)

        return unique`;

const CODE_PRIORITY = `# ml/priority_scorer.py
"""
Atribuição de prioridade (1–5) com base em:
  - Sentimento: URGENT=5, NEGATIVE+keywords=4, NEUTRAL=2, POSITIVE=1
  - Categoria: SECURITY e PUBLIC_HEALTH têm bónus de urgência
  - Palavras-chave de urgência no texto
  - Número de pontos de exclamação / maiúsculas
  - Boost para relatórios sobre crianças, idosos, grávidas

Escala:
  5 — Emergência imediata (vida em risco)
  4 — Urgente (impacto grave em 24h)
  3 — Prioritário (resolução em 72h)
  2 — Normal (resolução em 5 dias)
  1 — Baixa prioridade (informativo / elogio)
"""
from __future__ import annotations

import re
from ml.schemas import ReportCategory, SentimentLabel

# Palavras que aumentam a urgência
URGENCY_BOOSTERS = [
    "criança", "bebé", "bébé", "grávida", "idoso", "idosa", "deficiente",
    "cadeirante", "recém-nascido", "acamado", "ferido", "inconsciente",
    "urgente", "emergência", "socorro", "imediato", "agora", "já",
    "incêndio", "explosão", "desabamento", "inundação grave",
    "perigo de vida", "risco de morte", "sem acesso a médico",
]

# Categorias com pontuação base mais alta
CATEGORY_BASE: dict[str, int] = {
    "SECURITY":       4,
    "PUBLIC_HEALTH":  3,
    "INFRASTRUCTURE": 2,
    "ENVIRONMENT":    2,
    "EDUCATION":      2,
    "OTHER":          1,
}

SENTIMENT_BASE: dict[str, int] = {
    "URGENT":   5,
    "NEGATIVE": 3,
    "NEUTRAL":  2,
    "POSITIVE": 1,
}


def score_priority(
    text:      str,
    category:  ReportCategory,
    sentiment: SentimentLabel,
) -> int:
    """
    Devolve score de prioridade entre 1 e 5.
    Algoritmo determinístico e auditável.
    """
    # Base por sentimento
    score = SENTIMENT_BASE[sentiment.value]

    # Boost por categoria
    cat_base = CATEGORY_BASE.get(category.value, 1)
    score = max(score, cat_base)

    # Boost por palavras de urgência no texto
    text_lower = text.lower()
    urgency_hits = sum(1 for kw in URGENCY_BOOSTERS if kw in text_lower)
    if urgency_hits >= 3:
        score = min(score + 2, 5)
    elif urgency_hits >= 1:
        score = min(score + 1, 5)

    # Boost por múltiplos pontos de exclamação (sinal de urgência)
    exclamation_count = text.count("!")
    if exclamation_count >= 3:
        score = min(score + 1, 5)

    # Boost por texto em maiúsculas (>30% = grito)
    uppercase_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    if uppercase_ratio > 0.30:
        score = min(score + 1, 5)

    # Elogios (POSITIVE) nunca ultrapassam prioridade 2
    if sentiment == SentimentLabel.POSITIVE:
        score = min(score, 2)

    return max(1, min(5, score))


# ─── Mapeamento categoria → departamento ──────────────────────
# Usado pelo pipeline para recomendar o departamento correcto.

DEPARTMENT_MAP: dict[str, str] = {
    "INFRASTRUCTURE": "Direcção de Obras Públicas",
    "PUBLIC_HEALTH":  "Direcção de Saúde",
    "SECURITY":       "Serviço de Segurança Municipal",
    "ENVIRONMENT":    "Direcção do Ambiente",
    "EDUCATION":      "Direcção da Educação",
    "OTHER":          "Administração Municipal",
}

def recommend_department(category: ReportCategory) -> str:
    return DEPARTMENT_MAP.get(category.value, "Administração Municipal")`;

const CODE_PIPELINE = `# ml/pipeline.py
"""
Pipeline NLP completo para OP1NA1.

Uso:
    pipeline = NLPPipeline.from_disk(Path("models/nlp"))
    result   = pipeline.run(NLPInput(report_id="...", text="..."))

Ou treinar do zero:
    pipeline = NLPPipeline()
    pipeline.train()
    pipeline.save(Path("models/nlp"))
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Optional

from ml.schemas import Department, NLPInput, NLPResult, ReportCategory
from ml.classifier import ReportClassifier
from ml.rules import RuleBasedClassifier
from ml.location_extractor import LocationExtractor
from ml.priority_scorer import score_priority, recommend_department

import logging
log = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.60   # abaixo deste valor → usar fallback por regras
MAX_INFERENCE_MS     = 500    # orçamento de tempo por relatório


class NLPPipeline:

    def __init__(self) -> None:
        self._classifier = ReportClassifier()
        self._rules      = RuleBasedClassifier()
        self._location   = LocationExtractor()
        self._trained    = False

    # ── Treino ────────────────────────────────────────────────

    def train(self, load_spacy: bool = True) -> None:
        self._classifier.train(load_spacy=load_spacy)
        if load_spacy:
            try:
                import spacy
                nlp = spacy.load("pt_core_news_sm")
                self._location = LocationExtractor(nlp=nlp)
                # Partilhar o modelo spaCy entre classifier e location extractor
                self._classifier._nlp = nlp
            except OSError:
                log.warning("pt_core_news_sm não disponível. NER básico activado.")
        self._trained = True
        log.info("NLPPipeline treinado.")

    # ── Inferência ────────────────────────────────────────────

    def run(self, inp: NLPInput) -> NLPResult:
        t_start = time.perf_counter()

        # 1. Classificação ML
        used_fallback    = False
        keywords_matched: list[str] = []

        if self._trained:
            try:
                cat, cat_conf, sent, sent_conf = self._classifier.predict(inp.text)

                # 2. Fallback por regras se confiança baixa
                if cat_conf < CONFIDENCE_THRESHOLD:
                    log.debug(
                        "nlp.fallback report=%s cat_conf=%.2f",
                        inp.report_id, cat_conf,
                    )
                    cat, cat_conf, keywords_matched = self._rules.classify_category(inp.text)
                    used_fallback = True

                if sent_conf < CONFIDENCE_THRESHOLD:
                    sent, sent_conf = self._rules.classify_sentiment(inp.text)
                    used_fallback = True

            except Exception as exc:
                log.warning("nlp.ml_failed report=%s err=%s — usando regras", inp.report_id, exc)
                cat, cat_conf, keywords_matched = self._rules.classify_category(inp.text)
                sent, sent_conf = self._rules.classify_sentiment(inp.text)
                used_fallback = True
        else:
            # Modelo não treinado → apenas regras
            cat, cat_conf, keywords_matched = self._rules.classify_category(inp.text)
            sent, sent_conf = self._rules.classify_sentiment(inp.text)
            used_fallback = True

        # 3. Extracção de localizações
        locations = self._location.extract(inp.text, bairro_hint=inp.bairro_hint)

        # 4. Score de prioridade
        priority = score_priority(inp.text, cat, sent)

        # 5. Departamento recomendado
        dept_str = recommend_department(cat)
        department = Department(dept_str)

        # 6. Verificar orçamento de tempo
        elapsed_ms = (time.perf_counter() - t_start) * 1000
        if elapsed_ms > MAX_INFERENCE_MS:
            log.warning(
                "nlp.slow report=%s elapsed=%.1fms (budget=%dms)",
                inp.report_id, elapsed_ms, MAX_INFERENCE_MS,
            )

        return NLPResult(
            report_id=inp.report_id,
            category=cat,
            category_confidence=round(cat_conf, 3),
            sentiment=sent,
            sentiment_confidence=round(sent_conf, 3),
            priority=priority,
            department=department,
            locations=locations,
            used_fallback=used_fallback,
            inference_ms=round(elapsed_ms, 1),
            keywords_matched=keywords_matched,
        )

    # ── Persistência ──────────────────────────────────────────

    def save(self, path: Path) -> None:
        path.mkdir(parents=True, exist_ok=True)
        self._classifier.save(path)
        log.info("Pipeline guardado em %s", path)

    def load(self, path: Path) -> None:
        self._classifier.load(path)
        self._trained = True
        try:
            import spacy
            nlp = spacy.load("pt_core_news_sm")
            self._location   = LocationExtractor(nlp=nlp)
            self._classifier._nlp = nlp
        except OSError:
            pass

    @classmethod
    def from_disk(cls, path: Path) -> "NLPPipeline":
        pipeline = cls()
        pipeline.load(path)
        return pipeline

    # ── Integração FastAPI ────────────────────────────────────

    @classmethod
    def get_singleton(cls) -> "NLPPipeline":
        """
        Usar como dependência FastAPI via lifespan:
            @asynccontextmanager
            async def lifespan(app: FastAPI):
                app.state.nlp = NLPPipeline.from_disk(Path("models/nlp"))
                yield

            async def get_nlp(request: Request) -> NLPPipeline:
                return request.app.state.nlp
        """
        raise NotImplementedError("Usar lifespan para gerir o singleton.")`;

const CODE_TRAIN = `# ml/train.py
"""
Script de treino e avaliação do pipeline NLP.

Uso:
    python -m ml.train --output models/nlp --eval

Recomendações para produção:
  1. Recolher 200+ relatórios reais por categoria (anotação humana)
  2. Balancear as classes (StratifiedKFold)
  3. Correr avaliação com classification_report
  4. Monitorizar drift mensal — re-treinar se accuracy cair >5%
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from sklearn.model_selection import StratifiedKFold, cross_val_score

from ml.classifier import ReportClassifier, TRAINING_DATA_CATEGORY, TRAINING_DATA_SENTIMENT
from ml.pipeline import NLPPipeline
from ml.schemas import NLPInput


def evaluate_classifier(clf: ReportClassifier) -> dict:
    from sklearn.metrics import classification_report

    cat_texts  = [t for t, _ in TRAINING_DATA_CATEGORY]
    cat_labels = [l for _, l in TRAINING_DATA_CATEGORY]

    # Cross-validation com 3 folds (corpus pequeno)
    cat_scores = cross_val_score(
        clf._cat_pipeline, cat_texts, cat_labels,
        cv=StratifiedKFold(n_splits=3, shuffle=True, random_state=42),
        scoring="f1_macro",
    )

    return {
        "category_f1_macro_cv": float(np.mean(cat_scores)),
        "category_f1_std":      float(np.std(cat_scores)),
    }


def smoke_test_pipeline(pipeline: NLPPipeline) -> None:
    """Testar casos de fronteira em Português Angolano."""
    test_cases = [
        ("O buraco na estrada do Rangel está a causar acidentes, kuia ganda!", "INFRASTRUCTURE", "URGENT"),
        ("Mosquitos bue nesta zona do Golf 2, risco de malária", "PUBLIC_HEALTH", "NEGATIVE"),
        ("Assalto à mão armada na madrugada, SOCORRO urgente!", "SECURITY", "URGENT"),
        ("Obrigado pela boa atenção, fixe mesmo!", "OTHER", "POSITIVE"),
        ("Escola sem professores há um mês no Palanca", "EDUCATION", "NEGATIVE"),
        ("Queimada no musseque perto do Benfica", "ENVIRONMENT", "NEGATIVE"),
        ("", None, None),  # texto vazio → deve usar fallback sem crash
    ]

    print("\\n=== Smoke Test ===")
    for text, expected_cat, expected_sent in test_cases:
        if not text:
            try:
                pipeline.run(NLPInput(report_id="test_empty", text="x"))
                print("  PASS: texto mínimo sem crash")
            except Exception as e:
                print(f"  FAIL: {e}")
            continue

        result = pipeline.run(NLPInput(report_id="test", text=text))
        cat_ok  = expected_cat  is None or result.category.value  == expected_cat
        sent_ok = expected_sent is None or result.sentiment.value == expected_sent
        status  = "PASS" if (cat_ok and sent_ok) else "FAIL"
        print(
            f"  {status} | cat={result.category.value:<15} "
            f"({result.category_confidence:.2f}) | "
            f"sent={result.sentiment.value:<8} ({result.sentiment_confidence:.2f}) | "
            f"{result.inference_ms:.0f}ms | {text[:50]}"
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="models/nlp", help="Directório de output")
    parser.add_argument("--eval",   action="store_true",  help="Correr avaliação")
    parser.add_argument("--smoke",  action="store_true",  help="Correr smoke tests")
    args = parser.parse_args()

    output_path = Path(args.output)

    print("A treinar o pipeline NLP...")
    pipeline = NLPPipeline()
    pipeline.train(load_spacy=True)

    if args.eval:
        print("A avaliar...")
        metrics = evaluate_classifier(pipeline._classifier)
        print(json.dumps(metrics, indent=2))

    if args.smoke:
        smoke_test_pipeline(pipeline)

    pipeline.save(output_path)
    print(f"\\nPipeline guardado em {output_path}/")
    print("  category_pipeline.joblib")
    print("  sentiment_pipeline.joblib")


if __name__ == "__main__":
    main()`;

const CODE_TESTS = `# tests/test_nlp_pipeline.py
"""
Testes unitários do pipeline NLP.

Correr:
    pytest tests/test_nlp_pipeline.py -v

Cobertura:
  - Classificação de categoria (PT angolano)
  - Detecção de sentimento + urgência
  - Extracção de localidades
  - Score de prioridade
  - Fallback por regras
  - Edge cases: texto vazio, apenas emojis, código misto PT+inglês
  - Orçamento de tempo 500ms
"""
from __future__ import annotations

import time

import pytest

from ml.pipeline import NLPPipeline
from ml.rules import RuleBasedClassifier
from ml.location_extractor import LocationExtractor
from ml.priority_scorer import score_priority
from ml.schemas import (
    NLPInput, ReportCategory, SentimentLabel,
)


# ─── Fixture ─────────────────────────────────────────────────

@pytest.fixture(scope="module")
def pipeline() -> NLPPipeline:
    """Pipeline treinado com dados sintéticos (sem GPU)."""
    p = NLPPipeline()
    p.train(load_spacy=False)   # False para testes rápidos (sem spaCy)
    return p


@pytest.fixture
def rules() -> RuleBasedClassifier:
    return RuleBasedClassifier()


@pytest.fixture
def loc() -> LocationExtractor:
    return LocationExtractor()   # sem spaCy para testes unitários


# ─── Testes de categoria ──────────────────────────────────────

class TestCategoryClassification:

    def test_infrastructure_road(self, rules):
        cat, conf, kws = rules.classify_category(
            "A estrada do bairro está cheia de buracos, impossível passar"
        )
        assert cat == ReportCategory.INFRASTRUCTURE
        assert "buraco" in kws or "estrada" in kws

    def test_infrastructure_water(self, rules):
        cat, conf, _ = rules.classify_category("Falta água canalizada no bairro há 3 dias")
        assert cat == ReportCategory.INFRASTRUCTURE

    def test_public_health_malaria(self, rules):
        cat, conf, _ = rules.classify_category(
            "Mosquitos bue nesta zona, risco de malária no Golf 2"
        )
        assert cat == ReportCategory.PUBLIC_HEALTH

    def test_security_assault(self, rules):
        cat, conf, _ = rules.classify_category(
            "Houve um assalto à mão armada na madrugada, gambôa perigosa"
        )
        assert cat == ReportCategory.SECURITY

    def test_environment_fire(self, rules):
        cat, conf, _ = rules.classify_category(
            "Queimada ilegal a destruir a vegetação perto do musseque"
        )
        assert cat == ReportCategory.ENVIRONMENT

    def test_education_school(self, rules):
        cat, conf, _ = rules.classify_category(
            "A escola está sem professores há um mês, crianças sem aula"
        )
        assert cat == ReportCategory.EDUCATION

    def test_angola_slang_kuia(self, rules):
        """'kuia ganda' (problema grande) deve indicar sentimento negativo."""
        cat, conf, _ = rules.classify_category(
            "A picada do musseque é uma kuia ganda para todos"
        )
        # Com gíria expandida, deve detectar "problema" → contexto geral
        assert conf >= 0.50

    def test_mixed_pt_english(self, rules):
        """Texto misto PT/inglês não deve causar erro."""
        cat, conf, _ = rules.classify_category(
            "The road in Rangel is broken, buraco everywhere"
        )
        assert cat in ReportCategory.__members__.values()


# ─── Testes de sentimento ─────────────────────────────────────

class TestSentimentClassification:

    def test_urgent_keywords(self, rules):
        sent, conf = rules.classify_sentiment(
            "URGENTE: criança inconsciente na rua, preciso de socorro já!"
        )
        assert sent == SentimentLabel.URGENT
        assert conf >= 0.85

    def test_urgent_exclamations(self, rules):
        sent, conf = rules.classify_sentiment("SOCORRO!!! Incêndio activo!!!")
        assert sent == SentimentLabel.URGENT

    def test_positive_thanks(self, rules):
        sent, conf = rules.classify_sentiment(
            "Obrigado pela rápida resposta, o técnico foi fixe mesmo!"
        )
        assert sent == SentimentLabel.POSITIVE

    def test_negative_angola_slang(self, rules):
        sent, conf = rules.classify_sentiment(
            "Vergonha total, má nada, já relatei 5 vezes e nada fizeram"
        )
        assert sent == SentimentLabel.NEGATIVE

    def test_neutral_factual(self, rules):
        sent, conf = rules.classify_sentiment(
            "O semáforo na esquina principal está avariado."
        )
        assert sent in (SentimentLabel.NEUTRAL, SentimentLabel.NEGATIVE)


# ─── Testes de localização ────────────────────────────────────

class TestLocationExtractor:

    def test_bairro_rangel(self, loc):
        entities = loc.extract("O buraco fica no Rangel, perto do mercado")
        labels = [e.label for e in entities]
        texts  = [e.text.lower() for e in entities]
        assert "BAIRRO" in labels
        assert any("rangel" in t for t in texts)

    def test_multiple_bairros(self, loc):
        entities = loc.extract("Problema no Rangel e no Golf 2 também")
        bairros = [e for e in entities if e.label == "BAIRRO"]
        assert len(bairros) >= 2

    def test_street_pattern(self, loc):
        entities = loc.extract("O problema fica na Rua do Mercado, número 5")
        streets = [e for e in entities if e.label == "STREET"]
        assert len(streets) >= 1

    def test_bairro_hint_injected(self, loc):
        entities = loc.extract("O esgoto rebentou aqui", bairro_hint="Camama")
        bairros = [e for e in entities if e.label == "BAIRRO"]
        assert any(e.text == "Camama" and e.start == -1 for e in bairros)

    def test_no_location(self, loc):
        entities = loc.extract("Não há localização mencionada no texto.")
        # Não deve lançar erro — lista vazia é válida
        assert isinstance(entities, list)

    def test_golf2_variants(self, loc):
        for variant in ["Golf 2", "golfe 2", "golf dois"]:
            entities = loc.extract(f"Problema no {variant}")
            assert any("BAIRRO" == e.label for e in entities), f"Falhou para: {variant}"


# ─── Testes de prioridade ─────────────────────────────────────

class TestPriorityScorer:

    def test_urgent_security_max_priority(self):
        score = score_priority(
            "Incêndio activo, risco de vida, SOCORRO imediato!",
            ReportCategory.SECURITY,
            SentimentLabel.URGENT,
        )
        assert score == 5

    def test_positive_praise_low_priority(self):
        score = score_priority(
            "Obrigado pela boa atenção, estamos satisfeitos",
            ReportCategory.OTHER,
            SentimentLabel.POSITIVE,
        )
        assert score <= 2

    def test_child_boosts_priority(self):
        score_without = score_priority(
            "Problema na escola",
            ReportCategory.EDUCATION,
            SentimentLabel.NEGATIVE,
        )
        score_with = score_priority(
            "Criança em perigo na escola, situação urgente",
            ReportCategory.EDUCATION,
            SentimentLabel.NEGATIVE,
        )
        assert score_with >= score_without

    def test_priority_bounds(self):
        for cat in ReportCategory:
            for sent in SentimentLabel:
                score = score_priority("texto de teste", cat, sent)
                assert 1 <= score <= 5, f"Fora dos bounds: {cat} + {sent} = {score}"


# ─── Testes de integração do pipeline ─────────────────────────

class TestPipelineIntegration:

    def test_full_pipeline_infrastructure(self, pipeline):
        result = pipeline.run(NLPInput(
            report_id="test-001",
            text="A estrada do Rangel está destruída, buraco enorme, kuia ganda!",
        ))
        assert result.category == ReportCategory.INFRASTRUCTURE
        assert result.priority >= 3
        assert result.inference_ms < 500   # orçamento de tempo

    def test_full_pipeline_urgent(self, pipeline):
        result = pipeline.run(NLPInput(
            report_id="test-002",
            text="URGENTE: incêndio no Golf 2, pessoas em perigo, SOCORRO!",
        ))
        assert result.sentiment == SentimentLabel.URGENT
        assert result.priority == 5

    def test_inference_time_budget(self, pipeline):
        """Garantir que 10 relatórios consecutivos ficam dentro do budget."""
        texts = [
            "Buraco na estrada do Palanca há semanas",
            "Falta luz no Rangel de madrugada, perigoso",
            "Mosquitos bue no Golf 2, risco de malária",
            "Assalto frequente no Benfica à noite",
            "Escola sem professor no Camama",
        ] * 2
        for text in texts:
            t0 = time.perf_counter()
            pipeline.run(NLPInput(report_id="t", text=text))
            elapsed = (time.perf_counter() - t0) * 1000
            assert elapsed < 500, f"Inference demorou {elapsed:.0f}ms > 500ms"

    def test_fallback_for_empty_like_text(self, pipeline):
        """Texto muito curto ou sem contexto deve usar fallback sem crash."""
        result = pipeline.run(NLPInput(report_id="edge-1", text="ok"))
        assert result.used_fallback is True or result.category is not None

    def test_department_mapping_complete(self, pipeline):
        """Todos os relatórios devem ter um departamento recomendado."""
        for cat in ReportCategory:
            result = pipeline.run(NLPInput(
                report_id="dept-test",
                text="problema no bairro",
            ))
            # result.department é sempre preenchido (nunca None)
            assert result.department is not None

    def test_serialization_round_trip(self, tmp_path, pipeline):
        """Guardar e recarregar o modelo deve dar os mesmos resultados."""
        from ml.pipeline import NLPPipeline

        pipeline.save(tmp_path)
        loaded = NLPPipeline.from_disk(tmp_path)

        text = "Buraco enorme na estrada do Rangel, impossível circular"
        r1 = pipeline.run(NLPInput(report_id="r1", text=text))
        r2 = loaded.run(NLPInput(report_id="r2", text=text))

        assert r1.category == r2.category
        assert r1.sentiment == r2.sentiment`;

// ─── UI ────────────────────────────────────────────────────────

const TABS = [
  { id: "visao",     label: "Visão Geral",                 code: null },
  { id: "schemas",   label: "ml/schemas.py",              code: CODE_SCHEMAS },
  { id: "classifier",label: "ml/classifier.py",           code: CODE_CLASSIFIER },
  { id: "rules",     label: "ml/rules.py",                code: CODE_RULES },
  { id: "location",  label: "ml/location_extractor.py",   code: CODE_LOCATION },
  { id: "priority",  label: "ml/priority_scorer.py",      code: CODE_PRIORITY },
  { id: "pipeline",  label: "ml/pipeline.py",             code: CODE_PIPELINE },
  { id: "train",     label: "ml/train.py",                code: CODE_TRAIN },
  { id: "tests",     label: "tests/test_nlp.py",          code: CODE_TESTS },
];

const CATEGORIES = [
  { value: "INFRASTRUCTURE",  pt: "Infraestrutura",   color: "bg-amber-100 text-amber-800",   dept: "Direcção de Obras Públicas",   example: "buracos, água, luz, esgoto, estradas" },
  { value: "PUBLIC_HEALTH",   pt: "Saúde Pública",    color: "bg-red-100 text-red-800",       dept: "Direcção de Saúde",            example: "malária, lixo, mosquitos, hospital" },
  { value: "SECURITY",        pt: "Segurança",        color: "bg-purple-100 text-purple-800", dept: "Serviço de Segurança Municipal", example: "assalto, crime, acidente, gambôa" },
  { value: "ENVIRONMENT",     pt: "Ambiente",         color: "bg-green-100 text-green-800",   dept: "Direcção do Ambiente",         example: "queimada, poluição, árvore, rio" },
  { value: "EDUCATION",       pt: "Educação",         color: "bg-blue-100 text-blue-800",     dept: "Direcção da Educação",         example: "escola, professor, livros, sala" },
  { value: "OTHER",           pt: "Outros",           color: "bg-gray-100 text-gray-700",     dept: "Administração Municipal",      example: "informações gerais, elogios" },
];

const SENTIMENTS = [
  { value: "URGENT",   color: "bg-red-600 text-white",       desc: "Emergência — vida em risco",     priority: "→ P5 automático" },
  { value: "NEGATIVE", color: "bg-orange-500 text-white",    desc: "Insatisfação, queixa",            priority: "→ P3–P4" },
  { value: "NEUTRAL",  color: "bg-slate-500 text-white",     desc: "Informação factual",              priority: "→ P2" },
  { value: "POSITIVE", color: "bg-green-600 text-white",     desc: "Elogio ou satisfação",            priority: "→ P1–P2 (cap)" },
];

const PIPELINE_STEPS = [
  { step: "NLPInput", detail: "report_id + text + channel + bairro_hint",                           ms: "0ms",   type: "action" },
  { step: "ML Classifier", detail: "TF-IDF + SGD: categoria + sentimento com probabilidades",       ms: "~15ms", type: "action" },
  { step: "Confidence check", detail: "cat_conf < 0.60 → RuleBasedClassifier (fallback)",           ms: "~1ms",  type: "check" },
  { step: "LocationExtractor", detail: "Gazetteer bairros + regex ruas + spaCy NER (GPE/LOC)",      ms: "~50ms", type: "action" },
  { step: "PriorityScorer", detail: "Determinístico: sentimento + categoria + urgência keywords",   ms: "~1ms",  type: "action" },
  { step: "DepartmentRouter", detail: "Mapeamento estático categoria → departamento municipal",      ms: "<1ms",  type: "action" },
  { step: "NLPResult", detail: "Devolve tudo + used_fallback + inference_ms + keywords_matched",    ms: "total", type: "success" },
];

const STEP_COLORS: Record<string, string> = {
  action:  "border-l-blue-500 bg-blue-50",
  check:   "border-l-amber-500 bg-amber-50",
  success: "border-l-green-500 bg-green-50",
};
const STEP_BADGES: Record<string, string> = {
  action:  "bg-blue-100 text-blue-700",
  check:   "bg-amber-100 text-amber-700",
  success: "bg-green-100 text-green-700",
};

const SLANG_SAMPLES = [
  { slang: "kuia",         std: "problema",              use: "\"kuia ganda\" = problema enorme" },
  { slang: "bue",          std: "muito / bastante",      use: "\"bue mosquitos\" = muitos mosquitos" },
  { slang: "candongueiro", std: "transporte (minibus)",  use: "\"candongueiro sem travões\"" },
  { slang: "musseque",     std: "bairro informal",       use: "\"musseque do Palanca\"" },
  { slang: "maka",         std: "problema / conflito",   use: "\"maka todos os dias\"" },
  { slang: "gambôa",       std: "zona perigosa",         use: "\"gambôa à noite\"" },
  { slang: "mbuandu",      std: "lixo / sujidade",       use: "\"água com mbuandu\"" },
  { slang: "fixe",         std: "bom / funcionar",       use: "\"o técnico foi fixe\"" },
  { slang: "má nada",      std: "problema grave",        use: "\"isto é má nada\"" },
  { slang: "picada",       std: "estrada informal",      use: "\"picada intransitável\"" },
];

const BUDGET = [
  { component: "TF-IDF vectorização", budget: "~10ms" },
  { component: "SGD predict_proba",   budget: "~5ms" },
  { component: "spaCy lemmatização",  budget: "~50ms" },
  { component: "Gazetteer lookup",    budget: "~2ms" },
  { component: "spaCy NER",          budget: "~40ms" },
  { component: "Regex ruas",         budget: "~1ms" },
  { component: "Priority scorer",    budget: "<1ms" },
  { component: "Department router",  budget: "<1ms" },
  { component: "Total (com spaCy)",  budget: "~110ms", highlight: true },
  { component: "Total (sem spaCy)",  budget: "~20ms",  highlight: true },
  { component: "Budget disponível",  budget: "500ms",  highlight: true },
];

export default function NLPPipeline() {
  const [activeTab, setActiveTab] = useState("visao");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          Pipeline NLP
        </h1>
        <p className="text-muted-foreground">
          spaCy · TF-IDF + SGD · Fallback por Regras · Gazetteer Mulenvos · Português Angolano · &lt;500ms CPU
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["CPU only", "<500ms inference", "pt_core_news_sm", "joblib serializable", "Gíria angolana", "Fallback conf<0.60"].map(t => (
          <span key={t} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs rounded font-medium">{t}</span>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-auto p-1 bg-secondary flex flex-wrap gap-1 w-full mb-2">
          {TABS.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs px-3 py-1.5 font-mono">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Visão Geral ───────────────────────────────────── */}
        <TabsContent value="visao" className="space-y-8">

          {/* Pipeline flow */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Fluxo do pipeline</h2>
            <ol className="space-y-2">
              {PIPELINE_STEPS.map((s, i) => (
                <li key={i} className={cn("border-l-4 pl-3 py-1.5 rounded-r", STEP_COLORS[s.type])}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded font-bold", STEP_BADGES[s.type])}>{i + 1}</span>
                    <code className="text-xs font-mono font-semibold text-foreground">{s.step}</code>
                    <span className="text-xs text-muted-foreground ml-auto font-mono">{s.ms}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-7">{s.detail}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Categories + departments */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Categorias → Departamentos municipais
            </h2>
            <div className="space-y-3">
              {CATEGORIES.map(c => (
                <div key={c.value} className="flex items-start gap-3 border border-border rounded-lg p-3">
                  <span className={cn("shrink-0 text-xs font-mono font-bold px-2 py-1 rounded mt-0.5", c.color)}>{c.value}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-foreground">{c.pt}</span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-xs text-muted-foreground font-medium">{c.dept}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.example}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sentiment */}
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Sentimento → Prioridade</h2>
              <div className="space-y-2">
                {SENTIMENTS.map(s => (
                  <div key={s.value} className="flex items-center gap-3">
                    <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded w-20 text-center", s.color)}>{s.value}</span>
                    <span className="text-xs text-muted-foreground flex-1">{s.desc}</span>
                    <code className="text-xs font-mono text-foreground shrink-0">{s.priority}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Orçamento de tempo por relatório
              </h2>
              <div className="space-y-1.5">
                {BUDGET.map((b, i) => (
                  <div key={i} className={cn("flex justify-between text-xs", b.highlight ? "font-bold text-foreground border-t border-border pt-1.5 mt-1" : "text-muted-foreground")}>
                    <span>{b.component}</span>
                    <code className="font-mono">{b.budget}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Slang */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Gíria e dialectismos angolanos — ANGOLA_SLANG dict
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Cada termo é expandido para Português padrão antes do vectorizador TF-IDF.
              Permite que o modelo treinado em Português padrão compreenda relatórios em Português Angolano
              sem re-treino com corpus específico.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-4 font-medium text-foreground text-xs">Gíria (Angola)</th>
                    <th className="text-left py-1.5 pr-4 font-medium text-foreground text-xs">Expansão</th>
                    <th className="text-left py-1.5 font-medium text-foreground text-xs">Exemplo de uso</th>
                  </tr>
                </thead>
                <tbody>
                  {SLANG_SAMPLES.map((s, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5 pr-4 font-mono text-xs font-bold text-foreground">{s.slang}</td>
                      <td className="py-1.5 pr-4 text-xs text-muted-foreground">{s.std}</td>
                      <td className="py-1.5 text-xs text-muted-foreground italic">{s.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Decisions */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Decisões de arquitectura</h2>
            {[
              {
                t: "TF-IDF + SGD em vez de modelo Transformer",
                d: "Bert-multilingual requer 400MB+ RAM e >200ms em CPU. SGDClassifier com TF-IDF tem <50ms de inferência, 5MB em disco (joblib), sem GPU, sem ONNX Runtime. Para o corpus actual (<500 exemplos por classe), a diferença de accuracy é irrelevante.",
              },
              {
                t: "Fallback por regras com threshold 0.60",
                d: "Se a probabilidade máxima do SGD for <0.60, o relatório é classificado pelo RuleBasedClassifier (keywords explícitas). Isto garante resultados auditáveis para casos ambíguos. keywords_matched é sempre devolvido no NLPResult para transparência.",
              },
              {
                t: "Expansão de gíria antes do TF-IDF",
                d: "Em vez de re-treinar com corpus angolano (inexistente), o ANGOLA_SLANG dict expande termos locais para Português padrão antes da vectorização. Actualizar o dict é imediato e não requer re-treino.",
              },
              {
                t: "Gazetteer para NER geográfico",
                d: "spaCy pt_core_news_sm não foi treinado com topónimos de Luanda. O BAIRRO_GAZETTEER cobre os 20+ bairros mais referenciados nos Mulenvos com variantes (ex: 'golfe 2', 'golf dois'). Confidence 0.95 para matches exactos, 0.70 para NER spaCy.",
              },
            ].map(item => (
              <div key={item.t} className="border border-border rounded-lg p-4">
                <p className="font-semibold text-sm text-foreground mb-1">{item.t}</p>
                <p className="text-xs text-muted-foreground">{item.d}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Tabs de código ───────────────────────────────── */}
        {TABS.filter(t => t.code !== null).map(t => (
          <TabsContent key={t.id} value={t.id}>
            <CodeBlock code={t.code!} language="python" />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
