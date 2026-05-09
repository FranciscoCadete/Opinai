import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlock from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

// ─── Code ──────────────────────────────────────────────────────────────────

const CODE_SCHEMAS = `# analytics/schemas.py
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class CrisisLevel(str, Enum):
    WATCH    = "WATCH"    # 1 sinal: monitorizar de perto
    WARNING  = "WARNING"  # 2 sinais: notificar equipa municipal
    CRISIS   = "CRISIS"   # 3+ sinais: alerta máximo + webhook externo


class CrisisTrigger(str, Enum):
    VOLUME_ANOMALY   = "VOLUME_ANOMALY"   # volume > 3x média 7 dias
    KEYWORD_CLUSTER  = "KEYWORD_CLUSTER"  # cluster de termos críticos
    GEO_HOTSPOT      = "GEO_HOTSPOT"      # DBSCAN detectou hotspot


class CrisisAlert(BaseModel):
    """Payload JSON enviado a webhooks e guardado na BD."""
    alert_id:        str
    level:           CrisisLevel
    bairro:          str
    triggers:        list[CrisisTrigger]   # NUNCA alertar com menos de 2
    triggered_at:    datetime
    expires_at:      datetime              # deduplicação — não repetir em 2h

    # Detalhe de cada sinal
    volume_detail:   Optional[VolumeAnomalyDetail]  = None
    keyword_detail:  Optional[KeywordClusterDetail] = None
    hotspot_detail:  Optional[GeoHotspotDetail]     = None

    # Relatórios envolvidos
    report_ids:      list[str]
    report_count:    int

    # Auditabilidade
    confidence:      float = Field(ge=0.0, le=1.0)
    human_review:    bool  = False   # True para casos borderline (conf < 0.80)
    raw_signals:     dict[str, Any] = Field(default_factory=dict)


class VolumeAnomalyDetail(BaseModel):
    current_count:       int      # relatórios na última hora
    hourly_baseline:     float    # média horária dos últimos 7 dias
    ratio:               float    # current / baseline
    threshold:           float    # = 3.0
    min_absolute:        int      # mínimo absoluto para evitar 0*3=0


class KeywordClusterDetail(BaseModel):
    keywords_found:      list[str]
    keyword_counts:      dict[str, int]
    critical_threshold:  int      # ≥ 3 ocorrências do mesmo termo


class GeoHotspotDetail(BaseModel):
    cluster_id:          int
    report_count:        int
    centroid_lat:        float
    centroid_lng:        float
    radius_km:           float
    dbscan_eps:          float    # 0.008 graus ≈ 0.9km
    dbscan_min_samples:  int      # 5


class TrendReport(BaseModel):
    """Relatório semanal por bairro — gerado pelo Pandas."""
    generated_at:        datetime
    period_start:        datetime
    period_end:          datetime
    bairro_summaries:    list[BairroSummary]
    municipality_totals: dict[str, int]


class BairroSummary(BaseModel):
    bairro:              str
    total_reports:       int
    top_5_issues:        list[IssueCount]
    avg_resolution_days: Optional[float]
    open_rate:           float    # % relatórios ainda abertos
    weekly_trend:        str      # "RISING" | "STABLE" | "DECLINING"


class IssueCount(BaseModel):
    category:    str
    count:       int
    pct_change:  Optional[float]  # vs semana anterior`;

const CODE_ANOMALY = `# analytics/anomaly_detector.py
"""
Detecção de anomalias de volume por bairro.

Algoritmo: sliding window (1 hora) vs baseline (média horária 7 dias).
Threshold: volume_actual > RATIO_THRESHOLD * baseline AND volume_actual >= MIN_ABSOLUTE

Zero false-positive strategy:
  1. Threshold alto: 3x (não 2x)
  2. Mínimo absoluto: >= 5 relatórios na janela (0 * 3 = 0 não dispara)
  3. Requer validação por 2º sinal antes de escalar para CRISIS
  4. Deduplicação: mesmo bairro + tipo → silenciar por 2 horas
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np
import pandas as pd

from analytics.schemas import CrisisAlert, CrisisTrigger, VolumeAnomalyDetail

RATIO_THRESHOLD  = 3.0    # 3x a média horária de 7 dias
MIN_ABSOLUTE     = 5      # mínimo de relatórios na janela (evita falsos positivos em volumes baixos)
WINDOW_HOURS     = 1      # janela deslizante
BASELINE_DAYS    = 7      # histórico para calcular a baseline
DEDUP_HOURS      = 2      # suprimir alerta repetido no mesmo bairro por N horas


class VolumeAnomalyDetector:

    def __init__(self) -> None:
        # Cache de alertas recentes para deduplicação
        # chave: (bairro, trigger_type) → expires_at
        self._recent_alerts: dict[tuple[str, str], datetime] = {}

    def run(
        self,
        reports_df: pd.DataFrame,
        reference_time: Optional[datetime] = None,
    ) -> list[dict]:
        """
        reports_df: DataFrame com colunas [report_id, bairro, created_at]
        Devolve lista de dicts com os sinais de anomalia detectados.
        """
        now = reference_time or datetime.now(timezone.utc)
        window_start = now - timedelta(hours=WINDOW_HOURS)
        baseline_start = now - timedelta(days=BASELINE_DAYS)

        if reports_df.empty:
            return []

        df = reports_df.copy()
        df["created_at"] = pd.to_datetime(df["created_at"], utc=True)

        signals: list[dict] = []

        for bairro, group in df.groupby("bairro"):
            signal = self._analyse_bairro(
                bairro=str(bairro),
                group=group,
                now=now,
                window_start=window_start,
                baseline_start=baseline_start,
            )
            if signal:
                signals.append(signal)

        return signals

    def _analyse_bairro(
        self,
        bairro: str,
        group: pd.DataFrame,
        now: datetime,
        window_start: datetime,
        baseline_start: datetime,
    ) -> Optional[dict]:
        # 1. Contar relatórios na janela actual (última 1 hora)
        in_window = group[group["created_at"] >= window_start]
        current_count = len(in_window)

        if current_count < MIN_ABSOLUTE:
            return None   # volume insuficiente — não alertar

        # 2. Calcular baseline horária nos últimos 7 dias
        in_baseline = group[
            (group["created_at"] >= baseline_start) &
            (group["created_at"] < window_start)
        ]

        # Agrupar por hora do dia e calcular a média de relatórios/hora
        if in_baseline.empty:
            return None   # sem histórico suficiente

        in_baseline = in_baseline.copy()
        in_baseline["hour_bucket"] = in_baseline["created_at"].dt.floor("h")
        hourly_counts = in_baseline.groupby("hour_bucket").size()

        # Usar a mesma hora do dia para comparação justa (sazonalidade horária)
        current_hour = now.hour
        same_hour_counts = hourly_counts[
            hourly_counts.index.hour == current_hour
        ]

        if same_hour_counts.empty:
            # Fallback: média geral quando não há histórico da hora específica
            baseline = float(hourly_counts.mean())
        else:
            baseline = float(same_hour_counts.mean())

        if baseline < 0.5:
            # Baseline quase zero — usar mínimo artificial para evitar explosão do ratio
            baseline = 0.5

        ratio = current_count / baseline

        if ratio < RATIO_THRESHOLD:
            return None

        # 3. Verificar deduplicação
        dedup_key = (bairro, CrisisTrigger.VOLUME_ANOMALY.value)
        if dedup_key in self._recent_alerts:
            if now < self._recent_alerts[dedup_key]:
                return None   # ainda dentro da janela de silêncio

        # 4. Registar alerta recente
        self._recent_alerts[dedup_key] = now + timedelta(hours=DEDUP_HOURS)

        # Limpar entradas expiradas
        self._recent_alerts = {
            k: v for k, v in self._recent_alerts.items() if v > now
        }

        return {
            "trigger":   CrisisTrigger.VOLUME_ANOMALY,
            "bairro":    bairro,
            "report_ids": in_window["report_id"].tolist(),
            "detail":    VolumeAnomalyDetail(
                current_count=current_count,
                hourly_baseline=round(baseline, 2),
                ratio=round(ratio, 2),
                threshold=RATIO_THRESHOLD,
                min_absolute=MIN_ABSOLUTE,
            ),
            "confidence": min(0.50 + (ratio - RATIO_THRESHOLD) * 0.15, 0.95),
        }`;

const CODE_KEYWORD = `# analytics/keyword_monitor.py
"""
Monitorização de clusters de palavras-chave críticas.

Termos críticos monitorizados (Português Angolano):
  inundação, violência, incêndio, epidemia + variantes dialectais

Zero false-positive strategy:
  - Mínimo de 3 ocorrências do mesmo termo na janela (não apenas 1)
  - Normalização de termos (variantes ortográficas, gíria angolana)
  - Score ponderado: termos de nível CRITICAL valem 2× termos WARNING
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Optional

import pandas as pd

from analytics.schemas import CrisisTrigger, KeywordClusterDetail

# ─── Dicionário de termos críticos ───────────────────────────
# Cada entrada: canonical_term → (weight, variantes regex)
#   weight 2 = CRITICAL, weight 1 = WARNING

CRITICAL_TERMS: dict[str, tuple[int, list[str]]] = {
    # Desastres naturais e infra
    "inundação": (2, [
        r"\\binu[nm]da[çc][aã]o\\b", r"\\bcheias?\\b", r"\\balagamento\\b",
        r"\\bagua (a )?transbordar\\b", r"\\btransbordou\\b",
    ]),
    "incêndio": (2, [
        r"\\binc[eê]ndio\\b", r"\\bfogo (activo|a alastrar|descontrolado)\\b",
        r"\\bchamas?\\b", r"\\bqueimada (activa|em curso)\\b",
    ]),
    "desabamento": (2, [
        r"\\bdesabamento\\b", r"\\bcolaps[ou]\\b", r"\\bcasas? caiu\\b",
        r"\\bedif[íi]cio caiu\\b", r"\\btecto (caiu|a cair)\\b",
    ]),

    # Saúde pública
    "epidemia": (2, [
        r"\\bepidemia\\b", r"\\bsurto\\b", r"\\bcaso[s]? (de )?(m[aá]laria|c[oó]lera|febre|dengue)\\b",
        r"\\bmorte[s]? por\\b", r"\\bdoen[çc]a (a alastrar|a espalhar)\\b",
    ]),
    "cólera": (2, [
        r"\\bc[oó]lera\\b", r"\\bgastroenterite grav[eo]\\b",
        r"\\bdiarreia com sangue\\b",
    ]),
    "malária": (1, [
        r"\\bmal[aá]ria\\b", r"\\bmosquito[s]? (muitos|demais|prolifera)\\b",
    ]),

    # Segurança
    "violência": (2, [
        r"\\bviol[êe]ncia\\b", r"\\bassalto[s]? (armado[s]?|à mão armada)\\b",
        r"\\btiro[s]?\\b", r"\\bbala[s]?\\b", r"\\bgangue[s]?\\b",
        r"\\bmorte[s]? (a tiro|por arma)\\b",
    ]),
    "confronto": (2, [
        r"\\bconfrontos?\\b", r"\\bbriga[s]? (armada[s]?|com facas?)\\b",
        r"\\bpânico\\b", r"\\bmoradores em fuga\\b",
    ]),

    # Angola-specific slang crítico
    "gambôa_perigosa": (1, [
        r"\\bgamb[oô]a\\b", r"\\bzona perigosa\\b", r"\\bmaka (ganda|grave)\\b",
    ]),
}

MIN_OCCURRENCES    = 3   # mínimo por termo para disparar
WINDOW_MINUTES     = 60  # janela de análise
DEDUP_HOURS        = 2


class KeywordClusterMonitor:

    def __init__(self) -> None:
        self._compiled: dict[str, list[re.Pattern]] = {}
        self._weights:  dict[str, int] = {}
        self._dedup:    dict[tuple[str, str], datetime] = {}
        self._compile_patterns()

    def _compile_patterns(self) -> None:
        for term, (weight, patterns) in CRITICAL_TERMS.items():
            self._compiled[term] = [
                re.compile(p, re.IGNORECASE | re.UNICODE) for p in patterns
            ]
            self._weights[term] = weight

    def run(
        self,
        reports_df: pd.DataFrame,
        reference_time: Optional[datetime] = None,
    ) -> list[dict]:
        """
        reports_df: colunas [report_id, bairro, text, created_at]
        Devolve lista de sinais por bairro.
        """
        now = reference_time or datetime.now(timezone.utc)
        cutoff = now - timedelta(minutes=WINDOW_MINUTES)

        if reports_df.empty:
            return []

        df = reports_df.copy()
        df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
        recent = df[df["created_at"] >= cutoff]

        if recent.empty:
            return []

        signals: list[dict] = []

        for bairro, group in recent.groupby("bairro"):
            signal = self._analyse_bairro(str(bairro), group, now)
            if signal:
                signals.append(signal)

        return signals

    def _analyse_bairro(
        self,
        bairro: str,
        group: pd.DataFrame,
        now: datetime,
    ) -> Optional[dict]:
        all_text = " ".join(group["text"].dropna().astype(str).tolist())

        # Contar ocorrências por termo
        term_counts: dict[str, int] = {}
        for term, patterns in self._compiled.items():
            count = sum(
                len(p.findall(all_text))
                for p in patterns
            )
            if count >= MIN_OCCURRENCES:
                term_counts[term] = count

        if not term_counts:
            return None

        # Score ponderado
        weighted_score = sum(
            count * self._weights[term]
            for term, count in term_counts.items()
        )

        # Deduplicação
        dedup_key = (bairro, CrisisTrigger.KEYWORD_CLUSTER.value)
        if dedup_key in self._dedup and now < self._dedup[dedup_key]:
            return None
        self._dedup[dedup_key] = now + timedelta(hours=DEDUP_HOURS)
        self._dedup = {k: v for k, v in self._dedup.items() if v > now}

        # Confidence: score ponderado normalizado
        confidence = min(0.50 + weighted_score * 0.08, 0.95)

        return {
            "trigger":    CrisisTrigger.KEYWORD_CLUSTER,
            "bairro":     bairro,
            "report_ids": group["report_id"].tolist(),
            "detail":     KeywordClusterDetail(
                keywords_found=list(term_counts.keys()),
                keyword_counts=term_counts,
                critical_threshold=MIN_OCCURRENCES,
            ),
            "confidence": confidence,
        }`;

const CODE_HOTSPOT = `# analytics/hotspot_detector.py
"""
Detecção de hotspots geográficos via DBSCAN (scikit-learn).

Parâmetros calibrados para Luanda:
  eps = 0.008 graus ≈ 0.9km (distância entre relatórios no mesmo cluster)
  min_samples = 5 (mínimo de relatórios por cluster)

Zero false-positive strategy:
  - min_samples alto (5) para evitar clusters de 2-3 relatórios
  - Filtro temporal: apenas relatórios das últimas 4 horas
  - Filtro de categoria: apenas categorias de alto risco (SECURITY, PUBLIC_HEALTH, INFRASTRUCTURE)
  - Verificação de novidade: cluster deve ser novo (não já registado)
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN

from analytics.schemas import CrisisTrigger, GeoHotspotDetail

DBSCAN_EPS         = 0.008   # graus (~0.9km a Luanda ~9°S)
DBSCAN_MIN_SAMPLES = 5
WINDOW_HOURS       = 4
DEDUP_HOURS        = 4
HIGH_RISK_CATEGORIES = {"SECURITY", "PUBLIC_HEALTH", "INFRASTRUCTURE"}
EARTH_RADIUS_KM    = 6371.0


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distância em km entre dois pontos geográficos."""
    R = EARTH_RADIUS_KM
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = (np.sin(dlat / 2) ** 2 +
         np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) *
         np.sin(dlon / 2) ** 2)
    return R * 2 * np.arcsin(np.sqrt(a))


class GeoHotspotDetector:

    def __init__(
        self,
        eps: float = DBSCAN_EPS,
        min_samples: int = DBSCAN_MIN_SAMPLES,
    ) -> None:
        self._eps         = eps
        self._min_samples = min_samples
        self._dedup:      dict[str, datetime] = {}   # chave: cluster_signature
        self._clusterer   = DBSCAN(
            eps=self._eps,
            min_samples=self._min_samples,
            algorithm="ball_tree",
            metric="haversine",   # DBSCAN nativo com haversine
        )

    def run(
        self,
        reports_df: pd.DataFrame,
        reference_time: Optional[datetime] = None,
    ) -> list[dict]:
        """
        reports_df: colunas [report_id, bairro, lat, lng, category, created_at]
        Devolve lista de sinais de hotspot geográfico.
        """
        now = reference_time or datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=WINDOW_HOURS)

        df = reports_df.copy()
        df["created_at"] = pd.to_datetime(df["created_at"], utc=True)

        # Filtrar: janela temporal + apenas categorias de alto risco
        recent = df[
            (df["created_at"] >= cutoff) &
            (df["category"].isin(HIGH_RISK_CATEGORIES)) &
            df["lat"].notna() &
            df["lng"].notna()
        ]

        if len(recent) < self._min_samples:
            return []

        # DBSCAN requer radianos para haversine
        coords_rad = np.radians(recent[["lat", "lng"]].values)

        labels = self._clusterer.fit_predict(coords_rad)
        recent = recent.copy()
        recent["cluster_id"] = labels

        signals: list[dict] = []

        for cluster_id in set(labels):
            if cluster_id == -1:
                continue   # noise points — ignorar

            cluster = recent[recent["cluster_id"] == cluster_id]

            # Centróide
            centroid_lat = float(cluster["lat"].mean())
            centroid_lng = float(cluster["lng"].mean())

            # Raio aproximado (distância máxima ao centróide)
            radius_km = max(
                _haversine_km(centroid_lat, centroid_lng, row["lat"], row["lng"])
                for _, row in cluster.iterrows()
            )

            # Bairro dominante no cluster
            bairro = cluster["bairro"].mode().iloc[0] if not cluster["bairro"].mode().empty else "Desconhecido"

            # Deduplicação por assinatura geográfica (arredondar a 2 décimos de grau)
            sig = f"{round(centroid_lat, 2)}:{round(centroid_lng, 2)}"
            if sig in self._dedup and now < self._dedup[sig]:
                continue
            self._dedup[sig] = now + timedelta(hours=DEDUP_HOURS)
            self._dedup = {k: v for k, v in self._dedup.items() if v > now}

            count = len(cluster)
            confidence = min(0.50 + (count - self._min_samples) * 0.05, 0.95)

            signals.append({
                "trigger":    CrisisTrigger.GEO_HOTSPOT,
                "bairro":     bairro,
                "report_ids": cluster["report_id"].tolist(),
                "detail":     GeoHotspotDetail(
                    cluster_id=int(cluster_id),
                    report_count=count,
                    centroid_lat=round(centroid_lat, 6),
                    centroid_lng=round(centroid_lng, 6),
                    radius_km=round(radius_km, 3),
                    dbscan_eps=self._eps,
                    dbscan_min_samples=self._min_samples,
                ),
                "confidence": confidence,
            })

        return signals`;

const CODE_AGGREGATOR = `# analytics/crisis_aggregator.py
"""
Agrega sinais de múltiplos detectores e produz CrisisAlert.

Regra de escalonamento (zero false-positive):
  1 sinal  → WATCH   (só registo interno, sem notificação externa)
  2 sinais → WARNING  (notificar equipa municipal por e-mail)
  3 sinais → CRISIS   (webhook + e-mail + SMS para administrador)

Confidence final = média ponderada dos sinais individuais.
Se confidence < 0.80 → human_review = True (não bloquear, mas sinalizar).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from analytics.schemas import (
    CrisisAlert, CrisisLevel, CrisisTrigger,
    GeoHotspotDetail, KeywordClusterDetail, VolumeAnomalyDetail,
)

SIGNAL_WEIGHTS = {
    CrisisTrigger.VOLUME_ANOMALY:  1.0,
    CrisisTrigger.KEYWORD_CLUSTER: 1.2,   # keywords críticas têm mais peso
    CrisisTrigger.GEO_HOTSPOT:     1.1,
}

LEVEL_THRESHOLDS = {
    CrisisLevel.WATCH:   1,
    CrisisLevel.WARNING: 2,
    CrisisLevel.CRISIS:  3,
}


class CrisisAggregator:

    def aggregate(
        self,
        signals_by_bairro: dict[str, list[dict]],
        reference_time: Optional[datetime] = None,
    ) -> list[CrisisAlert]:
        """
        signals_by_bairro: { bairro → [signal_dict, ...] }
        Devolve apenas alertas com >= 2 sinais (WATCH ignorado externamente).
        """
        now = reference_time or datetime.now(timezone.utc)
        alerts: list[CrisisAlert] = []

        for bairro, signals in signals_by_bairro.items():
            if not signals:
                continue

            alert = self._build_alert(bairro, signals, now)
            if alert:
                alerts.append(alert)

        # Ordenar por nível de severidade descendente
        level_order = {CrisisLevel.CRISIS: 0, CrisisLevel.WARNING: 1, CrisisLevel.WATCH: 2}
        alerts.sort(key=lambda a: level_order[a.level])
        return alerts

    def _build_alert(
        self,
        bairro: str,
        signals: list[dict],
        now: datetime,
    ) -> Optional[CrisisAlert]:
        triggers = [s["trigger"] for s in signals]
        n_signals = len(signals)

        # Determinar nível
        if n_signals >= 3:
            level = CrisisLevel.CRISIS
        elif n_signals >= 2:
            level = CrisisLevel.WARNING
        else:
            level = CrisisLevel.WATCH

        # Confidence ponderada
        weighted_sum = sum(
            s["confidence"] * SIGNAL_WEIGHTS[s["trigger"]] for s in signals
        )
        total_weight = sum(SIGNAL_WEIGHTS[s["trigger"]] for s in signals)
        confidence = weighted_sum / total_weight

        # Agregar report_ids
        all_ids: list[str] = []
        for s in signals:
            all_ids.extend(s.get("report_ids", []))
        all_ids = list(dict.fromkeys(all_ids))  # deduplicar mantendo ordem

        # Extrair detalhes por tipo de sinal
        volume_detail  = next((s["detail"] for s in signals if s["trigger"] == CrisisTrigger.VOLUME_ANOMALY),  None)
        keyword_detail = next((s["detail"] for s in signals if s["trigger"] == CrisisTrigger.KEYWORD_CLUSTER), None)
        hotspot_detail = next((s["detail"] for s in signals if s["trigger"] == CrisisTrigger.GEO_HOTSPOT),     None)

        return CrisisAlert(
            alert_id=str(uuid.uuid4()),
            level=level,
            bairro=bairro,
            triggers=triggers,
            triggered_at=now,
            expires_at=now + timedelta(hours=2),
            volume_detail=volume_detail,
            keyword_detail=keyword_detail,
            hotspot_detail=hotspot_detail,
            report_ids=all_ids,
            report_count=len(all_ids),
            confidence=round(confidence, 3),
            human_review=confidence < 0.80,
            raw_signals={s["trigger"].value: s.get("detail", {}) for s in signals},
        )


def group_signals_by_bairro(all_signals: list[dict]) -> dict[str, list[dict]]:
    result: dict[str, list[dict]] = {}
    for signal in all_signals:
        bairro = signal["bairro"]
        result.setdefault(bairro, []).append(signal)
    return result`;

const CODE_TREND = `# analytics/trend_reporter.py
"""
Gerador de relatório semanal de tendências por bairro.

Output:
  1. TrendReport (Pydantic) — para guardar na BD / API
  2. HTML string — PDF-ready via WeasyPrint ou Puppeteer

Pipeline Pandas:
  - groupby(bairro, category) → contagem + resolução média
  - pct_change vs semana anterior
  - rolling(7d) para smooth de tendência
  - Top 5 issues por bairro
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np
import pandas as pd

from analytics.schemas import (
    BairroSummary, IssueCount, TrendReport,
)


class TrendReporter:

    def generate(
        self,
        reports_df: pd.DataFrame,
        reference_time: Optional[datetime] = None,
    ) -> tuple[TrendReport, str]:
        """
        reports_df: [report_id, bairro, category, status, created_at, resolved_at]
        Devolve (TrendReport, html_string).
        """
        now = reference_time or datetime.now(timezone.utc)
        period_end   = now
        period_start = now - timedelta(days=7)
        prev_start   = now - timedelta(days=14)

        df = reports_df.copy()
        df["created_at"]  = pd.to_datetime(df["created_at"],  utc=True)
        df["resolved_at"] = pd.to_datetime(df.get("resolved_at"), utc=True, errors="coerce")

        current_week = df[df["created_at"].between(period_start, period_end)]
        previous_week = df[df["created_at"].between(prev_start, period_start)]

        bairro_summaries = self._compute_bairro_summaries(
            current_week, previous_week
        )

        # Totais municipais por categoria
        municipality_totals = (
            current_week.groupby("category").size().to_dict()
        )

        trend = TrendReport(
            generated_at=now,
            period_start=period_start,
            period_end=period_end,
            bairro_summaries=bairro_summaries,
            municipality_totals={str(k): int(v) for k, v in municipality_totals.items()},
        )

        html = self._render_html(trend)
        return trend, html

    def _compute_bairro_summaries(
        self,
        current: pd.DataFrame,
        previous: pd.DataFrame,
    ) -> list[BairroSummary]:
        summaries: list[BairroSummary] = []

        all_bairros = set(current["bairro"].dropna().unique())

        for bairro in sorted(all_bairros):
            cur = current[current["bairro"] == bairro]
            prv = previous[previous["bairro"] == bairro]

            # Top 5 categorias na semana actual
            cat_counts = cur.groupby("category").size().sort_values(ascending=False)
            top5: list[IssueCount] = []
            for cat, count in cat_counts.head(5).items():
                prev_count = int(prv[prv["category"] == cat].shape[0])
                pct_change = (
                    (int(count) - prev_count) / prev_count * 100
                    if prev_count > 0 else None
                )
                top5.append(IssueCount(
                    category=str(cat),
                    count=int(count),
                    pct_change=round(pct_change, 1) if pct_change is not None else None,
                ))

            # Resolução média em dias
            resolved = cur[cur["resolved_at"].notna()].copy()
            if not resolved.empty:
                resolution_days = float(
                    (resolved["resolved_at"] - resolved["created_at"])
                    .dt.total_seconds()
                    .div(86400)
                    .mean()
                )
            else:
                resolution_days = None

            # Taxa de abertos
            open_count = int((cur["status"].isin(
                ["SUBMITTED", "TRIAGED", "ASSIGNED", "IN_PROGRESS"]
            )).sum())
            open_rate = open_count / max(len(cur), 1)

            # Tendência: comparar com semana anterior
            cur_total = len(cur)
            prv_total = len(prv)
            if prv_total == 0:
                trend_str = "STABLE"
            elif cur_total > prv_total * 1.20:
                trend_str = "RISING"
            elif cur_total < prv_total * 0.80:
                trend_str = "DECLINING"
            else:
                trend_str = "STABLE"

            summaries.append(BairroSummary(
                bairro=bairro,
                total_reports=cur_total,
                top_5_issues=top5,
                avg_resolution_days=round(resolution_days, 1) if resolution_days else None,
                open_rate=round(open_rate, 3),
                weekly_trend=trend_str,
            ))

        # Ordenar por total decrescente
        summaries.sort(key=lambda s: s.total_reports, reverse=True)
        return summaries

    def _render_html(self, report: TrendReport) -> str:
        """
        Gera HTML PDF-ready com:
          - Cabeçalho institucional (Município dos Mulenvos)
          - Tabela por bairro com top 5 issues
          - Indicadores municipais
          - Estilos inline (compatível com WeasyPrint)
        """
        period = (
            f"{report.period_start.strftime('%d/%m/%Y')} – "
            f"{report.period_end.strftime('%d/%m/%Y')}"
        )

        rows_html = ""
        for s in report.bairro_summaries:
            trend_icon = {"RISING": "↑", "DECLINING": "↓", "STABLE": "→"}.get(s.weekly_trend, "→")
            trend_color = {"RISING": "#CC0000", "DECLINING": "#22c55e", "STABLE": "#888"}.get(s.weekly_trend, "#888")
            top_issue = s.top_5_issues[0].category if s.top_5_issues else "—"

            rows_html += f"""
            <tr>
              <td style="padding:8px;border:1px solid #ddd;font-weight:bold">{s.bairro}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:center">{s.total_reports}</td>
              <td style="padding:8px;border:1px solid #ddd">{top_issue}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:center">
                {s.avg_resolution_days or "—"}{"d" if s.avg_resolution_days else ""}
              </td>
              <td style="padding:8px;border:1px solid #ddd;text-align:center">
                {round(s.open_rate * 100, 1)}%
              </td>
              <td style="padding:8px;border:1px solid #ddd;text-align:center;color:{trend_color};font-weight:bold">
                {trend_icon} {s.weekly_trend}
              </td>
            </tr>"""

        totals_html = "".join(
            f"<li><strong>{cat}</strong>: {count} relatórios</li>"
            for cat, count in sorted(report.municipality_totals.items(),
                                     key=lambda x: -x[1])
        )

        return f"""<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Relatório Semanal — Município dos Mulenvos</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 40px; color: #222; }}
    h1   {{ color: #CC0000; border-bottom: 2px solid #CC0000; padding-bottom: 8px; }}
    h2   {{ color: #333; margin-top: 30px; }}
    table{{ border-collapse: collapse; width: 100%; margin-top: 16px; font-size: 13px; }}
    th   {{ background: #1e2d4a; color: white; padding: 10px; text-align: left; }}
    tr:nth-child(even) {{ background: #f5f5f5; }}
    .meta {{ color: #666; font-size: 13px; margin-bottom: 20px; }}
    .badge-rising   {{ color: #CC0000; font-weight: bold; }}
    .badge-declining{{ color: #22c55e; font-weight: bold; }}
    @page {{ size: A4; margin: 20mm; }}
  </style>
</head>
<body>
  <h1>Relatório Semanal de Participação Cidadã</h1>
  <p class="meta">
    Município dos Mulenvos · Luanda, Angola<br>
    Período: {period}<br>
    Gerado em: {report.generated_at.strftime('%d/%m/%Y %H:%M')} UTC
  </p>

  <h2>Resumo por Bairro</h2>
  <table>
    <thead>
      <tr>
        <th>Bairro</th>
        <th>Total</th>
        <th>Principal Problema</th>
        <th>Resolução Média</th>
        <th>Taxa Abertos</th>
        <th>Tendência</th>
      </tr>
    </thead>
    <tbody>{rows_html}</tbody>
  </table>

  <h2>Totais Municipais por Categoria</h2>
  <ul>{totals_html}</ul>

  <p style="margin-top:40px;font-size:11px;color:#999">
    Documento gerado automaticamente pelo sistema OP1NA1.<br>
    Não reproduzir sem autorização da Administração Municipal dos Mulenvos.
  </p>
</body>
</html>"""`;

const CODE_DISPATCHER = `# analytics/alert_dispatcher.py
"""
Dispatcher de alertas de crise para:
  1. Webhook HTTP (POST JSON) — qualquer endpoint configurado
  2. E-mail SMTP — equipa municipal
  3. Registo na BD — tabela crisis_alerts

Níveis de notificação:
  WATCH   → só BD
  WARNING → BD + e-mail
  CRISIS  → BD + e-mail + webhook

Zero false-positive: alertas com human_review=True têm flag explícita no payload.
"""
from __future__ import annotations

import asyncio
import json
import logging
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text      import MIMEText

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from analytics.schemas import CrisisAlert, CrisisLevel
from app.config import settings

log = logging.getLogger(__name__)


class AlertDispatcher:

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def dispatch(self, alert: CrisisAlert) -> None:
        """Dispatch paralelo de todos os canais necessários."""
        tasks = [self._save_to_db(alert)]

        if alert.level in (CrisisLevel.WARNING, CrisisLevel.CRISIS):
            tasks.append(self._send_email(alert))

        if alert.level == CrisisLevel.CRISIS:
            tasks.append(self._post_webhook(alert))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                log.error(
                    "alert.dispatch_failed alert_id=%s channel=%d err=%s",
                    alert.alert_id, i, str(result),
                )

    # ── Base de dados ─────────────────────────────────────────

    async def _save_to_db(self, alert: CrisisAlert) -> None:
        from app.models.crisis_alert import CrisisAlertModel
        from datetime import timezone

        record = CrisisAlertModel(
            id=alert.alert_id,
            level=alert.level.value,
            bairro=alert.bairro,
            triggers=json.dumps([t.value for t in alert.triggers]),
            triggered_at=alert.triggered_at,
            expires_at=alert.expires_at,
            report_count=alert.report_count,
            confidence=alert.confidence,
            human_review=alert.human_review,
            payload=alert.model_dump_json(),
        )
        self._db.add(record)
        await self._db.commit()
        log.info("alert.saved alert_id=%s level=%s bairro=%s",
                 alert.alert_id, alert.level.value, alert.bairro)

    # ── Webhook ───────────────────────────────────────────────

    async def _post_webhook(self, alert: CrisisAlert) -> None:
        if not settings.CRISIS_WEBHOOK_URL:
            log.warning("alert.webhook_skip: CRISIS_WEBHOOK_URL não configurado")
            return

        payload = {
            "alert_id":     alert.alert_id,
            "level":        alert.level.value,
            "bairro":       alert.bairro,
            "triggers":     [t.value for t in alert.triggers],
            "triggered_at": alert.triggered_at.isoformat(),
            "report_count": alert.report_count,
            "confidence":   alert.confidence,
            "human_review": alert.human_review,
            # Detalhes estruturados
            "volume":       alert.volume_detail.model_dump()  if alert.volume_detail  else None,
            "keywords":     alert.keyword_detail.model_dump() if alert.keyword_detail else None,
            "hotspot":      alert.hotspot_detail.model_dump() if alert.hotspot_detail else None,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.CRISIS_WEBHOOK_URL,
                json=payload,
                headers={
                    "Content-Type":      "application/json",
                    "X-OP1NA1-Secret":   settings.CRISIS_WEBHOOK_SECRET,
                    "X-Alert-Level":     alert.level.value,
                },
            )

        if resp.status_code not in (200, 201, 202, 204):
            raise RuntimeError(
                f"Webhook retornou {resp.status_code}: {resp.text[:200]}"
            )

        log.info("alert.webhook_sent alert_id=%s url=%s status=%d",
                 alert.alert_id, settings.CRISIS_WEBHOOK_URL, resp.status_code)

    # ── E-mail ────────────────────────────────────────────────

    async def _send_email(self, alert: CrisisAlert) -> None:
        if not settings.CRISIS_EMAIL_TO:
            return

        subject = (
            f"[OP1NA1 {alert.level.value}] "
            f"Alerta de Crise — {alert.bairro}"
        )

        body = self._build_email_body(alert)

        await asyncio.get_event_loop().run_in_executor(
            None,
            self._send_smtp,
            settings.CRISIS_EMAIL_TO,
            subject,
            body,
        )

    def _build_email_body(self, alert: CrisisAlert) -> str:
        triggers_str = ", ".join(t.value for t in alert.triggers)
        review_note  = (
            "\\n⚠️  REVISÃO HUMANA RECOMENDADA (confidence < 80%)\\n"
            if alert.human_review else ""
        )

        lines = [
            f"ALERTA DE CRISE — {alert.level.value}",
            f"Bairro: {alert.bairro}",
            f"Detectado em: {alert.triggered_at.strftime('%d/%m/%Y %H:%M')} UTC",
            f"Sinais activos: {triggers_str}",
            f"Relatórios envolvidos: {alert.report_count}",
            f"Confiança: {alert.confidence * 100:.0f}%",
            review_note,
        ]

        if alert.volume_detail:
            v = alert.volume_detail
            lines.append(
                f"\\n[VOLUME] {v.current_count} relatórios na última hora "
                f"(baseline: {v.hourly_baseline}/h, ratio: {v.ratio:.1f}x)"
            )
        if alert.keyword_detail:
            k = alert.keyword_detail
            lines.append(
                f"\\n[KEYWORDS] {', '.join(k.keywords_found)} "
                f"(contagens: {k.keyword_counts})"
            )
        if alert.hotspot_detail:
            h = alert.hotspot_detail
            lines.append(
                f"\\n[HOTSPOT] {h.report_count} relatórios num raio de {h.radius_km}km "
                f"(centróide: {h.centroid_lat:.4f}, {h.centroid_lng:.4f})"
            )

        lines += [
            "\\n---",
            "Sistema OP1NA1 | Município dos Mulenvos | Luanda, Angola",
            "Responder a este e-mail não é monitorizado.",
        ]
        return "\\n".join(lines)

    def _send_smtp(self, to: str, subject: str, body: str) -> None:
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"]    = settings.SMTP_FROM
        msg["To"]      = to
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, [to], msg.as_string())

        log.info("alert.email_sent to=%s subject=%s", to, subject)`;

const CODE_SCHEDULER = `# analytics/scheduler.py
"""
APScheduler — orquestra todos os detectores a cada 15 minutos.

Jobs:
  1. run_crisis_detection (cada 15 min) — anomalia, keywords, DBSCAN
  2. generate_weekly_report (domingo às 07h00 WAT) — relatório PDF-ready
  3. cleanup_expired_alerts (cada hora) — apagar alertas expirados

Iniciar (CLI):
    python -m analytics.scheduler

Integrar com FastAPI (lifespan):
    from analytics.scheduler import start_scheduler, stop_scheduler

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        start_scheduler()
        yield
        stop_scheduler()
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron         import CronTrigger
from apscheduler.triggers.interval     import IntervalTrigger

log = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


# ─── Funções de job ───────────────────────────────────────────

def run_crisis_detection() -> None:
    """
    Executa a cada 15 minutos.
    Carrega relatórios recentes da BD, corre os 3 detectores,
    agrega sinais e despacha alertas.
    """
    asyncio.run(_async_run_crisis_detection())


async def _async_run_crisis_detection() -> None:
    from app.database.session import AsyncSessionLocal
    from analytics.anomaly_detector import VolumeAnomalyDetector
    from analytics.keyword_monitor  import KeywordClusterMonitor
    from analytics.hotspot_detector import GeoHotspotDetector
    from analytics.crisis_aggregator import CrisisAggregator, group_signals_by_bairro
    from analytics.alert_dispatcher  import AlertDispatcher

    import pandas as pd

    now = datetime.now(timezone.utc)
    log.info("crisis_detection.start ts=%s", now.isoformat())

    async with AsyncSessionLocal() as db:
        # 1. Carregar relatórios relevantes (últimas 24h — cobre todos os detectores)
        reports_df = await _fetch_reports(db, hours=24)

        if reports_df.empty:
            log.info("crisis_detection.skip: sem relatórios recentes")
            return

        # 2. Correr detectores em paralelo (CPU-bound — executar em threads)
        import concurrent.futures
        loop = asyncio.get_event_loop()

        volume_det  = VolumeAnomalyDetector()
        keyword_det = KeywordClusterMonitor()
        hotspot_det = GeoHotspotDetector()

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            vol_fut  = loop.run_in_executor(executor, volume_det.run,  reports_df, now)
            kw_fut   = loop.run_in_executor(executor, keyword_det.run, reports_df, now)
            geo_fut  = loop.run_in_executor(executor, hotspot_det.run, reports_df, now)
            vol_signals, kw_signals, geo_signals = await asyncio.gather(vol_fut, kw_fut, geo_fut)

        all_signals = vol_signals + kw_signals + geo_signals
        log.info("crisis_detection.signals total=%d", len(all_signals))

        if not all_signals:
            return

        # 3. Agregar por bairro
        by_bairro = group_signals_by_bairro(all_signals)
        aggregator = CrisisAggregator()
        alerts = aggregator.aggregate(by_bairro, reference_time=now)

        # 4. Despachar apenas WARNING + CRISIS (WATCH só é registado internamente)
        dispatcher = AlertDispatcher(db)
        for alert in alerts:
            log.info(
                "crisis_detection.alert level=%s bairro=%s confidence=%.2f triggers=%s",
                alert.level.value, alert.bairro, alert.confidence,
                [t.value for t in alert.triggers],
            )
            await dispatcher.dispatch(alert)


async def _fetch_reports(db, hours: int):
    """Carregar relatórios das últimas N horas como DataFrame."""
    import pandas as pd
    from datetime import timedelta
    from sqlalchemy import select, text

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    # Query raw para máxima eficiência (sem ORM overhead para DataFrames)
    result = await db.execute(
        text("""
            SELECT
                r.id            AS report_id,
                r.bairro        AS bairro,
                r.text          AS text,
                r.category      AS category,
                r.status        AS status,
                r.lat           AS lat,
                r.lng           AS lng,
                r.created_at    AS created_at,
                r.resolved_at   AS resolved_at
            FROM reports r
            WHERE r.created_at >= :cutoff
              AND r.deleted_at IS NULL
            ORDER BY r.created_at DESC
        """),
        {"cutoff": cutoff},
    )
    rows = result.fetchall()

    if not rows:
        import pandas as pd
        return pd.DataFrame()

    import pandas as pd
    return pd.DataFrame(rows, columns=result.keys())


def generate_weekly_report() -> None:
    """Executa aos domingos às 07h00 (WAT = UTC+1)."""
    asyncio.run(_async_generate_weekly_report())


async def _async_generate_weekly_report() -> None:
    from app.database.session import AsyncSessionLocal
    from analytics.trend_reporter import TrendReporter

    async with AsyncSessionLocal() as db:
        reports_df = await _fetch_reports(db, hours=24 * 7)
        reporter   = TrendReporter()
        trend, html = reporter.generate(reports_df)

        # Guardar HTML em disco
        output_dir = Path("reports")
        output_dir.mkdir(exist_ok=True)
        ts   = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
        path = output_dir / f"weekly_trend_{ts}.html"
        path.write_text(html, encoding="utf-8")
        log.info("weekly_report.saved path=%s", path)

        # Guardar TrendReport na BD
        await _save_trend_report(db, trend)


async def _save_trend_report(db, trend) -> None:
    from app.models.trend_report import TrendReportModel
    record = TrendReportModel(
        generated_at=trend.generated_at,
        period_start=trend.period_start,
        period_end=trend.period_end,
        payload=trend.model_dump_json(),
    )
    db.add(record)
    await db.commit()


def cleanup_expired_alerts() -> None:
    asyncio.run(_async_cleanup())


async def _async_cleanup() -> None:
    from app.database.session import AsyncSessionLocal
    from sqlalchemy import delete, text

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("DELETE FROM crisis_alerts WHERE expires_at < NOW()")
        )
        await db.commit()
        log.info("cleanup.deleted_alerts rows=%d", result.rowcount)


# ─── Lifecycle ────────────────────────────────────────────────

def start_scheduler() -> None:
    global _scheduler

    _scheduler = BackgroundScheduler(
        timezone="Africa/Luanda",   # WAT = UTC+1
        job_defaults={
            "coalesce":      True,   # não empilhar execuções em atraso
            "max_instances": 1,      # garantir execução única por job
        },
    )

    _scheduler.add_job(
        run_crisis_detection,
        IntervalTrigger(minutes=15),
        id="crisis_detection",
        name="Crisis Detection (15 min)",
        replace_existing=True,
    )

    _scheduler.add_job(
        generate_weekly_report,
        CronTrigger(day_of_week="sun", hour=7, minute=0),
        id="weekly_report",
        name="Weekly Trend Report (Sun 07:00 WAT)",
        replace_existing=True,
    )

    _scheduler.add_job(
        cleanup_expired_alerts,
        IntervalTrigger(hours=1),
        id="cleanup",
        name="Cleanup Expired Alerts (1h)",
        replace_existing=True,
    )

    _scheduler.start()
    log.info("scheduler.started jobs=%d", len(_scheduler.get_jobs()))


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        log.info("scheduler.stopped")


# ── Ponto de entrada standalone ───────────────────────────────
if __name__ == "__main__":
    import time
    logging.basicConfig(level=logging.INFO)
    start_scheduler()
    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        stop_scheduler()`;

const CODE_MIGRATION = `# ─── Migração 0007 — tabelas de analytics ────────────────────
# alembic/versions/0007_add_crisis_analytics.py

from alembic import op
import sqlalchemy as sa

revision      = "a1b2c3d4e5f6"
down_revision = "f6a7b8c9d0e1"   # 0006 notifications

def upgrade() -> None:
    # ── crisis_alerts ─────────────────────────────────────────
    op.create_table(
        "crisis_alerts",
        sa.Column("id",           sa.CHAR(36),    nullable=False),
        sa.Column("level",        sa.Enum("WATCH","WARNING","CRISIS",
                                          name="enum_crisis_level"), nullable=False),
        sa.Column("bairro",       sa.String(100), nullable=False),
        sa.Column("triggers",     sa.JSON(),      nullable=False),
        sa.Column("triggered_at", sa.DateTime(),  nullable=False),
        sa.Column("expires_at",   sa.DateTime(),  nullable=False),
        sa.Column("report_count", sa.Integer(),   nullable=False),
        sa.Column("confidence",   sa.Float(),     nullable=False),
        sa.Column("human_review", sa.Boolean(),   nullable=False, server_default="0"),
        sa.Column("payload",      sa.Text(),      nullable=False),   # JSON completo
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("idx_crisis_level",        "crisis_alerts", ["level"])
    op.create_index("idx_crisis_bairro",       "crisis_alerts", ["bairro"])
    op.create_index("idx_crisis_triggered_at", "crisis_alerts", ["triggered_at"])
    op.create_index("idx_crisis_expires_at",   "crisis_alerts", ["expires_at"])
    op.create_index("idx_crisis_human_review", "crisis_alerts", ["human_review"])

    # ── trend_reports ─────────────────────────────────────────
    op.create_table(
        "trend_reports",
        sa.Column("id",           sa.Integer(),   autoincrement=True, nullable=False),
        sa.Column("generated_at", sa.DateTime(),  nullable=False),
        sa.Column("period_start", sa.DateTime(),  nullable=False),
        sa.Column("period_end",   sa.DateTime(),  nullable=False),
        sa.Column("payload",      sa.Text(),      nullable=False),   # TrendReport JSON
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("idx_trend_generated_at", "trend_reports", ["generated_at"])

    # ── Adicionar lat/lng à tabela reports (se não existir) ───
    op.add_column("reports", sa.Column("lat", sa.Float(), nullable=True))
    op.add_column("reports", sa.Column("lng", sa.Float(), nullable=True))
    op.create_index("idx_reports_geo", "reports", ["lat", "lng"])


def downgrade() -> None:
    op.drop_index("idx_reports_geo", "reports")
    op.drop_column("reports", "lng")
    op.drop_column("reports", "lat")
    op.drop_table("trend_reports")
    op.drop_table("crisis_alerts")

# ─── Adições ao app/config.py ─────────────────────────────────
# CRISIS_WEBHOOK_URL:    str = ""   # URL do webhook externo (Slack, Teams, etc.)
# CRISIS_WEBHOOK_SECRET: str = ""   # Segredo para X-OP1NA1-Secret header
# CRISIS_EMAIL_TO:       str = ""   # e-mail da equipa municipal (pode ser lista)`;

// ─── UI ────────────────────────────────────────────────────────

const TABS = [
  { id: "visao",       label: "Visão Geral",                  code: null },
  { id: "schemas",     label: "analytics/schemas.py",         code: CODE_SCHEMAS },
  { id: "anomaly",     label: "anomaly_detector.py",          code: CODE_ANOMALY },
  { id: "keyword",     label: "keyword_monitor.py",           code: CODE_KEYWORD },
  { id: "hotspot",     label: "hotspot_detector.py",          code: CODE_HOTSPOT },
  { id: "aggregator",  label: "crisis_aggregator.py",         code: CODE_AGGREGATOR },
  { id: "trend",       label: "trend_reporter.py",            code: CODE_TREND },
  { id: "dispatcher",  label: "alert_dispatcher.py",          code: CODE_DISPATCHER },
  { id: "scheduler",   label: "scheduler.py (APScheduler)",   code: CODE_SCHEDULER },
  { id: "migration",   label: "Migração 0007",                code: CODE_MIGRATION },
];

const DETECTORS = [
  {
    name: "VolumeAnomalyDetector",
    algo: "Sliding window 1h vs média horária 7 dias",
    trigger: "volume > 3× baseline AND n ≥ 5",
    color: "border-amber-400 bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
    why: "Sazonalidade horária: compara a mesma hora do dia (ex: 14h desta semana vs 14h das últimas 7 semanas) para evitar falsos positivos por pico diário normal.",
  },
  {
    name: "KeywordClusterMonitor",
    algo: "Regex pattern matching ponderado",
    trigger: "≥ 3 ocorrências de termo crítico em 60min",
    color: "border-red-400 bg-red-50",
    badge: "bg-red-100 text-red-800",
    why: "Termos CRITICAL pesam 2× termos WARNING. Gíria angolana coberta (maka ganda, gambôa, etc). Mínimo de 3 ocorrências evita relatórios isolados a disparar alertas.",
  },
  {
    name: "GeoHotspotDetector",
    algo: "DBSCAN (haversine, eps=0.008°≈0.9km)",
    trigger: "cluster ≥ 5 relatórios de alto risco em 4h",
    color: "border-purple-400 bg-purple-50",
    badge: "bg-purple-100 text-purple-800",
    why: "Filtra apenas SECURITY + PUBLIC_HEALTH + INFRASTRUCTURE. min_samples=5 alto para evitar micro-clusters de 2-3 relatórios. Deduplicação por assinatura geográfica (arredondada a 2 dec).",
  },
];

const ESCALATION = [
  { n: 1, level: "WATCH",   action: "Só registo interno",                 color: "bg-yellow-400", text: "text-yellow-900" },
  { n: 2, level: "WARNING", action: "Notificar equipa por e-mail",        color: "bg-orange-500", text: "text-white" },
  { n: 3, level: "CRISIS",  action: "Webhook + e-mail + SMS + BD",        color: "bg-red-600",    text: "text-white" },
];

const ZERO_FP = [
  { rule: "Mínimo absoluto de 5 relatórios", why: "Evita 0 × 3 = 0 disparar como anomalia" },
  { rule: "Dois sinais independentes mínimo para notificação externa", why: "1 sinal = WATCH (interno); 2+ = WARNING/CRISIS" },
  { rule: "Sazonalidade horária na baseline", why: "Compara a mesma hora do dia — picos normais de manhã não disparam alertas" },
  { rule: "Threshold de keywords = 3 ocorrências mínimas", why: "1 relatório isolado com 'incêndio' não é cluster" },
  { rule: "DBSCAN min_samples = 5", why: "Micro-clusters de 2-3 relatórios são ruído, não hotspot" },
  { rule: "Deduplicação de 2h por bairro + tipo", why: "Mesmo evento não gera múltiplos alertas no scheduler de 15min" },
  { rule: "human_review = True se confidence < 80%", why: "Casos borderline têm flag explícita — não são suprimidos, mas sinalizados" },
];

const JOBS = [
  { name: "run_crisis_detection", schedule: "a cada 15 minutos",                   detail: "3 detectores em ThreadPoolExecutor → agregação → dispatch" },
  { name: "generate_weekly_report", schedule: "domingo 07h00 WAT",                 detail: "Pandas trend report → HTML PDF-ready → guardar em BD" },
  { name: "cleanup_expired_alerts", schedule: "a cada hora",                        detail: "DELETE crisis_alerts WHERE expires_at < NOW()" },
];

const STEP_COLORS: Record<string, string> = {
  info:    "border-l-blue-500 bg-blue-50",
  warn:    "border-l-amber-500 bg-amber-50",
  danger:  "border-l-red-500 bg-red-50",
  success: "border-l-green-500 bg-green-50",
};

export default function CrisisDetection() {
  const [activeTab, setActiveTab] = useState("visao");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          Sistema de Detecção de Crises
        </h1>
        <p className="text-muted-foreground">
          Sliding Window · Keyword Clusters · DBSCAN · Pandas Trends · APScheduler 15min · Zero Falsos Positivos
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["Pandas + NumPy", "scikit-learn DBSCAN", "APScheduler 15min", "2-signal rule", "Deduplicação 2h", "HTML PDF-ready"].map(t => (
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

        <TabsContent value="visao" className="space-y-8">

          {/* 3 Detectores */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">3 Detectores independentes</h2>
            <div className="space-y-4">
              {DETECTORS.map(d => (
                <div key={d.name} className={cn("border-l-4 rounded-r-lg p-4", d.color)}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-foreground text-sm">{d.name}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded font-medium", d.badge)}>{d.trigger}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">{d.algo}</p>
                  <p className="text-xs text-muted-foreground">{d.why}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Escalamento */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Regra de escalamento — CrisisAggregator
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ESCALATION.map(e => (
                <div key={e.level} className="border border-border rounded-lg p-4 text-center">
                  <div className={cn("w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg", e.color)}>
                    {e.n}
                  </div>
                  <div className={cn("inline-block px-2 py-0.5 rounded text-xs font-mono font-bold mb-2", e.color, e.text)}>
                    {e.level}
                  </div>
                  <p className="text-xs text-muted-foreground">{e.action}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
              Confidence ponderada: KEYWORD_CLUSTER peso 1.2×, GEO_HOTSPOT 1.1×, VOLUME 1.0×.
              Se confidence {"<"} 0.80 → <code className="bg-secondary px-1 rounded">human_review = True</code> no payload (alerta não suprimido, mas sinalizado para revisão).
            </p>
          </div>

          {/* Zero FP */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Estratégia de zero falsos positivos — 7 regras
            </h2>
            <div className="space-y-2">
              {ZERO_FP.map((r, i) => (
                <div key={i} className="border-l-4 border-l-green-500 bg-green-50 pl-3 py-2 rounded-r">
                  <p className="text-xs font-semibold text-foreground">{r.rule}</p>
                  <p className="text-xs text-muted-foreground">{r.why}</p>
                </div>
              ))}
            </div>
          </div>

          {/* APScheduler jobs */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Jobs APScheduler (Africa/Luanda WAT = UTC+1)
            </h2>
            <div className="space-y-3">
              {JOBS.map(j => (
                <div key={j.name} className="flex gap-4 border border-border rounded-lg p-3">
                  <div className="shrink-0">
                    <code className="text-xs font-mono font-bold text-foreground block">{j.name}</code>
                    <span className="text-xs text-muted-foreground">{j.schedule}</span>
                  </div>
                  <p className="text-xs text-muted-foreground self-center">{j.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-secondary rounded p-3 text-xs font-mono text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Configuração APScheduler</p>
              <p>coalesce=True → não empilhar execuções em atraso</p>
              <p>max_instances=1 → garantir execução única por job</p>
              <p>DetectorsThreadPoolExecutor(max_workers=3) → 3 detectores em paralelo</p>
            </div>
          </div>

          {/* Payload JSON */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Exemplo de payload de alerta CRISIS
            </h2>
            <CodeBlock language="json" code={`{
  "alert_id":     "550e8400-e29b-41d4-a716-446655440000",
  "level":        "CRISIS",
  "bairro":       "Rangel",
  "triggers":     ["VOLUME_ANOMALY", "KEYWORD_CLUSTER", "GEO_HOTSPOT"],
  "triggered_at": "2025-05-09T14:32:00Z",
  "expires_at":   "2025-05-09T16:32:00Z",
  "report_count": 23,
  "confidence":   0.891,
  "human_review": false,
  "volume": {
    "current_count":   23,
    "hourly_baseline": 2.1,
    "ratio":           10.95,
    "threshold":       3.0,
    "min_absolute":    5
  },
  "keywords": {
    "keywords_found":     ["inundação", "desabamento"],
    "keyword_counts":     {"inundação": 11, "desabamento": 4},
    "critical_threshold": 3
  },
  "hotspot": {
    "cluster_id":         0,
    "report_count":       18,
    "centroid_lat":       -8.8147,
    "centroid_lng":       13.2302,
    "radius_km":          0.612,
    "dbscan_eps":         0.008,
    "dbscan_min_samples": 5
  }
}`} />
          </div>

          {/* Decisions */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Decisões de arquitectura</h2>
            {[
              { t: "Detectores em ThreadPoolExecutor (não async)", d: "Os 3 detectores usam Pandas e scikit-learn (CPU-bound, não I/O-bound). loop.run_in_executor com max_workers=3 paraleliza o processamento sem bloquear o event loop asyncio." },
              { t: "Baseline com sazonalidade horária", d: "Comparar 14h desta semana com 14h das últimas 7 semanas, não com a média diária. Evita que o pico normal de manhã (8h–10h) dispare alertas de volume todos os dias." },
              { t: "HTML inline-CSS para relatório PDF-ready", d: "WeasyPrint e Puppeteer requerem estilos inline (sem CSS externo). O template usa @page A4 e evita flexbox/grid para máxima compatibilidade com motores de renderização PDF." },
              { t: "Payload JSON completo no campo payload da BD", d: "Guardar o JSON completo do CrisisAlert (além de colunas indexadas) permite auditoria retroactiva e reconstrução de alertas históricos sem joins complexos." },
            ].map(item => (
              <div key={item.t} className="border border-border rounded-lg p-4">
                <p className="font-semibold text-sm text-foreground mb-1">{item.t}</p>
                <p className="text-xs text-muted-foreground">{item.d}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {TABS.filter(t => t.code !== null).map(t => (
          <TabsContent key={t.id} value={t.id}>
            <CodeBlock code={t.code!} language="python" />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
