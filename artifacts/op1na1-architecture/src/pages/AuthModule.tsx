import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlock from "@/components/CodeBlock";
import { cn } from "@/lib/utils";

// ─── Code content ──────────────────────────────────────────────────────────

const CODE_SECURITY = `# app/core/security.py
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS   = 30


class TokenPayload(BaseModel):
    sub:           str   # UUID do utilizador
    role:          str   # perfil RBAC
    jti:           str   # JWT ID — rastreio do refresh token
    type:          str   # "access" | "refresh"
    pwd_hash_frag: str   # primeiros 8 chars do hash bcrypt — invalidação de sessão
    iat:           int
    exp:           int


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def _pwd_frag(password_hash: str) -> str:
    """Extrai os primeiros 8 chars do hash bcrypt para vincular o token à senha actual.
    Quando a senha muda, o hash muda, o frag muda, e todos os tokens emitidos
    antes da mudança tornam-se inválidos automaticamente."""
    return password_hash[:8]


def create_access_token(
    user_id: str,
    role: str,
    password_hash: str,
    jti: str | None = None,
) -> str:
    now    = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub":           user_id,
        "role":          role,
        "jti":           jti or secrets.token_hex(16),
        "type":          "access",
        "pwd_hash_frag": _pwd_frag(password_hash),
        "iat":           int(now.timestamp()),
        "exp":           int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    user_id: str,
    role: str,
    password_hash: str,
) -> tuple[str, str]:
    """Devolve (token_codificado, jti). O jti é persistido na BD para
    rastreio e detecção de reutilização (refresh token rotation)."""
    now    = datetime.now(timezone.utc)
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    jti    = secrets.token_hex(32)
    payload: dict[str, Any] = {
        "sub":           user_id,
        "role":          role,
        "jti":           jti,
        "type":          "refresh",
        "pwd_hash_frag": _pwd_frag(password_hash),
        "iat":           int(now.timestamp()),
        "exp":           int(expire.timestamp()),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    return token, jti


def decode_token(token: str) -> TokenPayload:
    """Lança jwt.PyJWTError se o token for inválido ou expirado."""
    raw = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    return TokenPayload(**raw)`;

const CODE_RATE_LIMIT = `# app/core/rate_limit.py
"""
Rate limiter de login baseado em Redis.

Chave:       login_attempts:{sha256(ip:email)}
Limite:      5 tentativas por janela de 15 minutos
Granulidade: por IP + e-mail (evita bloqueio global de conta)

O contador é reposto após login bem-sucedido.
"""
from __future__ import annotations

import hashlib

import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status

from app.config import settings

WINDOW_SECONDS = 15 * 60   # 15 minutos
MAX_ATTEMPTS   = 5


def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


def _fingerprint(ip: str, email: str) -> str:
    raw = f"{ip}:{email.lower()}".encode()
    digest = hashlib.sha256(raw).hexdigest()
    return f"login_attempts:{digest}"


async def check_rate_limit(request: Request, email: str) -> None:
    """Lança HTTP 429 se o fingerprint excedeu MAX_ATTEMPTS."""
    ip  = request.client.host if request.client else "unknown"
    key = _fingerprint(ip, email)

    async with _get_redis() as r:
        count = await r.incr(key)
        if count == 1:
            # Primeira tentativa — definir expiração da janela
            await r.expire(key, WINDOW_SECONDS)
        if count > MAX_ATTEMPTS:
            ttl = await r.ttl(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code":                 "RATE_LIMIT_EXCEEDED",
                    "message":              "Demasiadas tentativas de login. Tente novamente em breve.",
                    "retry_after_seconds":  max(ttl, 0),
                },
                headers={"Retry-After": str(max(ttl, 0))},
            )


async def reset_rate_limit(request: Request, email: str) -> None:
    """Repor contador após login bem-sucedido."""
    ip  = request.client.host if request.client else "unknown"
    key = _fingerprint(ip, email)
    async with _get_redis() as r:
        await r.delete(key)`;

const CODE_DEPS = `# app/core/dependencies.py
from __future__ import annotations

from typing import Callable

import jwt as pyjwt
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenPayload, decode_token
from app.database.session import get_async_session
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,   # não lança erro se token ausente — tratamos manualmente
)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail={"code": "INVALID_TOKEN", "message": "Token inválido ou expirado."},
    headers={"WWW-Authenticate": "Bearer"},
)


async def _get_token_payload(
    cookie_token: str | None = Cookie(default=None, alias="access_token"),
    bearer_token: str | None = Depends(oauth2_scheme),
) -> TokenPayload:
    """
    Extrai o JWT do cookie httpOnly em primeiro lugar.
    Fallback para o header Authorization (clientes móveis nativos).
    O cookie tem precedência — é mais seguro para clientes browser.
    """
    raw_token = cookie_token or bearer_token
    if not raw_token:
        raise _CREDENTIALS_EXCEPTION
    try:
        payload = decode_token(raw_token)
    except pyjwt.PyJWTError:
        raise _CREDENTIALS_EXCEPTION
    if payload.type != "access":
        raise _CREDENTIALS_EXCEPTION
    return payload


async def get_current_user(
    payload: TokenPayload = Depends(_get_token_payload),
    db: AsyncSession    = Depends(get_async_session),
) -> User:
    result = await db.execute(
        select(User).where(
            User.id == payload.sub,
            User.deleted_at.is_(None),
        )
    )
    user: User | None = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise _CREDENTIALS_EXCEPTION

    # Invalidação de sessão por mudança de senha:
    # Se password_hash mudou desde a emissão do token, pwd_hash_frag não
    # corresponde — token rejeitado sem consulta extra à BD.
    if user.password_hash and not user.password_hash.startswith(payload.pwd_hash_frag):
        raise _CREDENTIALS_EXCEPTION

    return user


def require_role(*roles: str) -> Callable[..., User]:
    """
    Fábrica de dependências para controlo de acesso baseado em perfil (RBAC).

    Uso em rotas:
        @router.get("/admin/users")
        async def list_users(
            _user: User = Depends(require_role("admin")),
        ) -> ...:
            ...

        @router.get("/reports")
        async def list_reports(
            _user: User = Depends(require_role("admin", "manager", "analyst")),
        ) -> ...:
            ...

    Uso em serviços (verificação explícita):
        async def some_service(current_user: User) -> None:
            if current_user.role not in ("admin", "manager"):
                raise HTTPException(status_code=403, ...)
    """
    async def _checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code":    "FORBIDDEN",
                    "message": f"Acesso negado. Requer perfil: {', '.join(roles)}.",
                },
            )
        return current_user

    # Preservar nome para documentação OpenAPI
    _checker.__name__ = f"require_role({'|'.join(roles)})"
    return _checker`;

const CODE_SCHEMAS = `# app/schemas/auth.py
from __future__ import annotations

import re

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def no_surrounding_whitespace(cls, v: str) -> str:
        if v.strip() != v:
            raise ValueError("A senha não pode ter espaços no início ou no fim.")
        return v


class RefreshRequest(BaseModel):
    """Refresh token via cookie é preferencial.
    Este campo é fallback para clientes móveis nativos sem suporte a cookies."""
    refresh_token: str | None = None


class LogoutRequest(BaseModel):
    all_devices: bool = Field(
        default=False,
        description="Se True, invalida todos os refresh tokens do utilizador.",
    )


class TokenResponse(BaseModel):
    """Resposta de login/refresh. Os tokens são também definidos em cookies httpOnly."""
    token_type: str = "bearer"
    expires_in: int             # TTL do access token em segundos
    user_id:    str
    role:       str


class FacebookCallbackParams(BaseModel):
    code:  str = Field(min_length=1)
    state: str = Field(min_length=16)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=8)
    new_password:     str = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def complexity(cls, v: str) -> str:
        errors: list[str] = []
        if not re.search(r"[A-Z]", v):
            errors.append("pelo menos uma maiúscula")
        if not re.search(r"[0-9]", v):
            errors.append("pelo menos um dígito")
        if not re.search(r"[^a-zA-Z0-9]", v):
            errors.append("pelo menos um carácter especial")
        if errors:
            raise ValueError(f"A senha deve conter: {', '.join(errors)}.")
        return v

    @model_validator(mode="after")
    def passwords_differ(self) -> "PasswordChangeRequest":
        if self.current_password == self.new_password:
            raise ValueError("A nova senha deve ser diferente da actual.")
        return self


class UserPublic(BaseModel):
    id:          str
    email:       str | None
    phone:       str | None
    full_name:   str | None
    role:        str
    is_verified: bool
    locale:      str


class OtpSendRequest(BaseModel):
    phone: str = Field(
        pattern=r"^\\+244[0-9]{9}$",
        description="Número angolano em formato E.164: +244912345678",
    )


class OtpVerifyRequest(BaseModel):
    phone: str = Field(pattern=r"^\\+244[0-9]{9}$")
    code:  str = Field(min_length=6, max_length=6, pattern=r"^[0-9]{6}$")`;

const CODE_MODEL = `# app/models/refresh_token.py
"""
Modelo para rastreio e rotação de refresh tokens.

Cada refresh token emitido tem o seu JTI persistido aqui.
Na rotação, o JTI antigo é marcado como revogado e um novo é emitido.
Se um JTI revogado for apresentado, todos os tokens do utilizador
são revogados (detecção de reutilização / token theft).
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id:         Mapped[str]              = mapped_column(String(36), primary_key=True)
    jti:        Mapped[str]              = mapped_column(String(64),  nullable=False, unique=True, index=True)
    user_id:    Mapped[str]              = mapped_column(String(36),  ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    created_at: Mapped[datetime]         = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")`;

const CODE_SERVICE = `# app/services/auth_service.py
from __future__ import annotations

import secrets
import urllib.parse
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

import httpx
from fastapi import HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User

_INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail={"code": "INVALID_CREDENTIALS", "message": "E-mail ou senha incorrectos."},
)
_INACTIVE_ACCOUNT = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail={"code": "ACCOUNT_INACTIVE", "message": "Conta desactivada. Contacte o administrador."},
)
_INVALID_REFRESH = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail={"code": "INVALID_REFRESH_TOKEN", "message": "Refresh token inválido ou expirado."},
)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Autenticação e-mail / senha ──────────────────────────────
    async def authenticate(
        self, email: str, password: str
    ) -> tuple[str, str, User]:
        user = await self._get_user_by_email(email)
        if user is None or not user.password_hash:
            raise _INVALID_CREDENTIALS
        if not verify_password(password, user.password_hash):
            raise _INVALID_CREDENTIALS
        if not user.is_active:
            raise _INACTIVE_ACCOUNT
        await self._update_last_login(user.id)
        return await self._issue_tokens(user)

    # ── Rotação de refresh token ─────────────────────────────────
    async def rotate_refresh_token(
        self, raw_token: str
    ) -> tuple[str, str, User]:
        import jwt as pyjwt
        try:
            payload = decode_token(raw_token)
        except pyjwt.PyJWTError:
            raise _INVALID_REFRESH

        if payload.type != "refresh":
            raise _INVALID_REFRESH

        # Verificar que o JTI existe na BD e não foi revogado
        result = await self._db.execute(
            select(RefreshToken).where(
                RefreshToken.jti == payload.jti,
                RefreshToken.user_id == payload.sub,
                RefreshToken.revoked_at.is_(None),
            )
        )
        token_row = result.scalar_one_or_none()

        if token_row is None:
            # JTI revogado apresentado de novo — possível roubo de token.
            # Revogar todos os tokens do utilizador como medida de segurança.
            await self._revoke_all(payload.sub)
            raise _INVALID_REFRESH

        user = await self._get_user_by_id(payload.sub)
        if user is None or not user.is_active:
            raise _INVALID_REFRESH

        # Verificar que a senha não foi alterada desde a emissão do token
        if user.password_hash and not user.password_hash.startswith(payload.pwd_hash_frag):
            raise _INVALID_REFRESH

        # Revogar token antigo e emitir novo par
        await self._revoke_jti(payload.jti)
        return await self._issue_tokens(user)

    # ── Revogação ────────────────────────────────────────────────
    async def revoke_tokens(
        self,
        user_id: str,
        refresh_token: str | None,
        all_devices: bool,
    ) -> None:
        if all_devices:
            await self._revoke_all(user_id)
        elif refresh_token:
            try:
                payload = decode_token(refresh_token)
                await self._revoke_jti(payload.jti)
            except Exception:
                pass  # logout best-effort: limpar cookies mesmo sem token válido

    # ── Facebook OAuth ───────────────────────────────────────────
    def get_facebook_auth_url(self) -> str:
        """Gera URL de autorização OAuth 2.0 do Facebook."""
        state = secrets.token_urlsafe(32)
        # Em produção, persistir state em Redis (TTL 10 min) para validação no callback
        params = urllib.parse.urlencode({
            "client_id":     settings.FACEBOOK_APP_ID,
            "redirect_uri":  settings.FACEBOOK_REDIRECT_URI,
            "scope":         "email,public_profile",
            "response_type": "code",
            "state":         state,
        })
        return f"https://www.facebook.com/v19.0/dialog/oauth?{params}"

    async def authenticate_facebook(
        self, code: str, state: str
    ) -> tuple[str, str, User]:
        # 1. Trocar code por access token
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_resp = await client.get(
                "https://graph.facebook.com/v19.0/oauth/access_token",
                params={
                    "client_id":     settings.FACEBOOK_APP_ID,
                    "client_secret": settings.FACEBOOK_APP_SECRET,
                    "redirect_uri":  settings.FACEBOOK_REDIRECT_URI,
                    "code":          code,
                },
            )
        token_resp.raise_for_status()
        fb_access_token: str = token_resp.json()["access_token"]

        # 2. Obter perfil do utilizador
        async with httpx.AsyncClient(timeout=10.0) as client:
            profile_resp = await client.get(
                "https://graph.facebook.com/v19.0/me",
                params={
                    "fields":       "id,email,name",
                    "access_token": fb_access_token,
                },
            )
        profile_resp.raise_for_status()
        profile: dict = profile_resp.json()

        fb_id:    str       = profile["id"]
        fb_email: str | None = profile.get("email")
        fb_name:  str       = profile.get("name", "")

        # 3. Encontrar ou criar utilizador
        user = await self._find_or_create_fb_user(fb_id, fb_email, fb_name)
        if not user.is_active:
            raise _INACTIVE_ACCOUNT

        await self._update_last_login(user.id)
        return await self._issue_tokens(user)

    # ── Helpers privados ─────────────────────────────────────────
    async def _issue_tokens(self, user: User) -> tuple[str, str, User]:
        pw_hash = user.password_hash or ""
        refresh_str, jti = create_refresh_token(user.id, user.role, pw_hash)
        access_str = create_access_token(user.id, user.role, pw_hash, jti=jti)

        # Persistir JTI para rastreio de rotação
        self._db.add(RefreshToken(
            id=str(uuid.uuid4()),
            jti=jti,
            user_id=user.id,
        ))
        await self._db.commit()
        return access_str, refresh_str, user

    async def _get_user_by_email(self, email: str) -> User | None:
        result = await self._db.execute(
            select(User).where(
                User.email == email.lower(),
                User.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def _get_user_by_id(self, user_id: str) -> User | None:
        result = await self._db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def _update_last_login(self, user_id: str) -> None:
        await self._db.execute(
            update(User)
            .where(User.id == user_id)
            .values(last_login_at=datetime.now(timezone.utc))
        )
        await self._db.commit()

    async def _revoke_jti(self, jti: str) -> None:
        await self._db.execute(
            update(RefreshToken)
            .where(RefreshToken.jti == jti)
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self._db.commit()

    async def _revoke_all(self, user_id: str) -> None:
        await self._db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self._db.commit()

    async def _find_or_create_fb_user(
        self, fb_id: str, email: str | None, name: str
    ) -> User:
        # Pesquisar por e-mail em primeiro lugar
        if email:
            result = await self._db.execute(
                select(User).where(
                    User.email == email.lower(),
                    User.deleted_at.is_(None),
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                if not existing.fb_provider_id:
                    existing.fb_provider_id = fb_id
                    await self._db.commit()
                return existing

        # Pesquisar por fb_provider_id
        result = await self._db.execute(
            select(User).where(
                User.fb_provider_id == fb_id,
                User.deleted_at.is_(None),
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        # Criar novo utilizador cidadão via Facebook
        new_user = User(
            id=str(uuid.uuid4()),
            email=email.lower() if email else None,
            full_name=name,
            fb_provider_id=fb_id,
            role="citizen",
            is_verified=True,    # Facebook verifica o e-mail
            is_active=True,
            locale="pt_AO",
        )
        self._db.add(new_user)
        await self._db.commit()
        await self._db.refresh(new_user)
        return new_user`;

const CODE_ROUTER = `# app/routers/v1/auth.py
from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_role
from app.core.rate_limit import check_rate_limit, reset_rate_limit
from app.core.security import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from app.database.session import get_async_session
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    TokenResponse,
    UserPublic,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticação"])

# Em desenvolvimento, definir COOKIE_SECURE=False no .env
_COOKIE_SECURE   = True
_COOKIE_SAMESITE = "lax"    # "strict" para produção sem OAuth redirects cross-origin


def _set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
) -> None:
    """Define os dois tokens como cookies httpOnly.
    O refresh token tem o path restrito ao endpoint de renovação."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth/refresh",  # cookie só é enviado para este path
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token",  path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh")


# ─── POST /auth/login ──────────────────────────────────────────
@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Autenticação com e-mail e senha",
    description="Rate limiting: 5 tentativas por 15 minutos por IP+e-mail.",
)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    # Rate limiting antes de qualquer acesso à base de dados
    await check_rate_limit(request, body.email)

    svc = AuthService(db)
    access_token, refresh_token, user = await svc.authenticate(
        body.email, body.password
    )

    # Repor contador após login bem-sucedido
    await reset_rate_limit(request, body.email)
    _set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        role=user.role,
    )


# ─── POST /auth/refresh ────────────────────────────────────────
@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Renovar access token (rotação de refresh token)",
)
async def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest = RefreshRequest(),
    db: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    # Cookie tem precedência sobre o body (clientes browser)
    raw_refresh = request.cookies.get("refresh_token") or body.refresh_token
    if not raw_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "MISSING_REFRESH_TOKEN", "message": "Refresh token não encontrado."},
        )

    svc = AuthService(db)
    access_token, new_refresh, user = await svc.rotate_refresh_token(raw_refresh)

    _set_auth_cookies(response, access_token, new_refresh)

    return TokenResponse(
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        role=user.role,
    )


# ─── POST /auth/logout ─────────────────────────────────────────
@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Terminar sessão",
)
async def logout(
    request: Request,
    response: Response,
    body: LogoutRequest = LogoutRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> None:
    raw_refresh = request.cookies.get("refresh_token")
    svc = AuthService(db)
    await svc.revoke_tokens(
        user_id=current_user.id,
        refresh_token=raw_refresh,
        all_devices=body.all_devices,
    )
    _clear_auth_cookies(response)


# ─── GET /auth/facebook ────────────────────────────────────────
@router.get(
    "/facebook",
    summary="Iniciar fluxo OAuth 2.0 do Facebook",
)
async def facebook_oauth_start() -> dict[str, str]:
    svc = AuthService.__new__(AuthService)
    url = svc.get_facebook_auth_url()
    return {"redirect_url": url}


# ─── GET /auth/facebook/callback ──────────────────────────────
@router.get(
    "/facebook/callback",
    response_model=TokenResponse,
    summary="Callback OAuth Facebook",
)
async def facebook_callback(
    code: str,
    state: str,
    response: Response,
    db: AsyncSession = Depends(get_async_session),
) -> TokenResponse:
    svc = AuthService(db)
    access_token, refresh_token, user = await svc.authenticate_facebook(code, state)

    _set_auth_cookies(response, access_token, refresh_token)

    return TokenResponse(
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        role=user.role,
    )


# ─── GET /auth/me ──────────────────────────────────────────────
@router.get(
    "/me",
    response_model=UserPublic,
    summary="Perfil do utilizador autenticado",
)
async def me(
    current_user: User = Depends(get_current_user),
) -> UserPublic:
    return UserPublic(
        id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        full_name=current_user.full_name,
        role=current_user.role,
        is_verified=current_user.is_verified,
        locale=current_user.locale,
    )


# ─── GET /auth/admin-only (exemplo RBAC) ───────────────────────
@router.get(
    "/admin-only",
    summary="Exemplo de endpoint restrito a admins",
    include_in_schema=False,
)
async def admin_only(
    _user: User = Depends(require_role("admin")),
) -> dict[str, str]:
    return {"message": "Acesso confirmado — apenas administradores."}`;

const CODE_MIG = `"""Adicionar tabela refresh_tokens para rotação segura de tokens

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2025-05-09 00:03:00.000000

Adiciona também a coluna fb_provider_id à tabela users para suporte
ao login via Facebook OAuth.
"""
from alembic import op
import sqlalchemy as sa

revision      = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # ─── refresh_tokens ────────────────────────────────────────
    op.create_table(
        "refresh_tokens",
        sa.Column("id",         sa.CHAR(36),   nullable=False),
        sa.Column("jti",        sa.String(64), nullable=False),
        sa.Column("user_id",    sa.CHAR(36),   nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("jti", name="uq_refresh_tokens_jti"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("idx_rt_jti",        "refresh_tokens", ["jti"])
    op.create_index("idx_rt_user_id",    "refresh_tokens", ["user_id"])
    op.create_index("idx_rt_revoked_at", "refresh_tokens", ["revoked_at"])

    # ─── users: coluna fb_provider_id ──────────────────────────
    op.add_column(
        "users",
        sa.Column("fb_provider_id", sa.String(64), nullable=True, unique=False),
    )
    op.create_index("idx_users_fb_provider", "users", ["fb_provider_id"])


def downgrade() -> None:
    op.drop_index("idx_users_fb_provider", "users")
    op.drop_column("users", "fb_provider_id")
    op.drop_table("refresh_tokens")`;

const CODE_CONFIG = `# Campos a adicionar à classe Settings em app/config.py
# Usar pydantic-settings com leitura do ficheiro .env

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Base de dados ──────────────────────────────────────────
    DATABASE_URL: str  # mysql+aiomysql://user:pass@host:3306/op1na1_db

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT ───────────────────────────────────────────────────
    # Gerar com: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str   # mínimo 32 caracteres — nunca commitar o valor real

    # ── Facebook OAuth ─────────────────────────────────────────
    FACEBOOK_APP_ID:      str = ""
    FACEBOOK_APP_SECRET:  str = ""
    FACEBOOK_REDIRECT_URI: str = (
        "https://api.mulenvos.gv.ao/api/v1/auth/facebook/callback"
    )

    # ── Cookies ────────────────────────────────────────────────
    COOKIE_SECURE:   bool = True   # False apenas em desenvolvimento local
    COOKIE_SAMESITE: str  = "lax"

    # ── Ambiente ───────────────────────────────────────────────
    APP_ENV: str = "production"  # "development" | "production"
    DEBUG:   bool = False


settings = Settings()

# ─── .env.example ─────────────────────────────────────────────
# Copiar para .env e preencher os valores reais.
# Nunca commitar o ficheiro .env.

# DATABASE_URL=mysql+aiomysql://op1na1_app:SENHA_BD@localhost:3306/op1na1_db
# REDIS_URL=redis://localhost:6379/0
# SECRET_KEY=gerar_com_secrets_token_hex_32
# FACEBOOK_APP_ID=id_da_app_no_meta_for_developers
# FACEBOOK_APP_SECRET=segredo_da_app_facebook
# FACEBOOK_REDIRECT_URI=https://api.mulenvos.gv.ao/api/v1/auth/facebook/callback
# COOKIE_SECURE=true
# APP_ENV=production
# DEBUG=false`;

const TABS = [
  { id: "visao",    label: "Visão Geral",          code: null },
  { id: "security", label: "core/security.py",     code: CODE_SECURITY },
  { id: "ratelimit",label: "core/rate_limit.py",   code: CODE_RATE_LIMIT },
  { id: "deps",     label: "core/dependencies.py", code: CODE_DEPS },
  { id: "schemas",  label: "schemas/auth.py",      code: CODE_SCHEMAS },
  { id: "model",    label: "models/refresh_token.py", code: CODE_MODEL },
  { id: "service",  label: "services/auth_service.py", code: CODE_SERVICE },
  { id: "router",   label: "routers/v1/auth.py",   code: CODE_ROUTER },
  { id: "mig0004",  label: "Migração 0004",         code: CODE_MIG },
  { id: "config",   label: "config.py / .env",     code: CODE_CONFIG },
];

interface FlowStep {
  step: string;
  detail: string;
  type: "action" | "check" | "error" | "success";
}

const LOGIN_FLOW: FlowStep[] = [
  { step: "POST /auth/login",          detail: "Receber body {email, password}",                      type: "action" },
  { step: "Rate limit check",          detail: "Redis: ≤5 tentativas / 15 min por IP+e-mail",         type: "check" },
  { step: "Buscar utilizador na BD",   detail: "SELECT * FROM users WHERE email = :email",            type: "action" },
  { step: "Verificar password_hash",   detail: "bcrypt.verify(plain, hash) — timing-safe",            type: "check" },
  { step: "Verificar is_active",       detail: "Conta desactivada → 403 ACCOUNT_INACTIVE",           type: "check" },
  { step: "Emitir token pair",         detail: "create_access_token + create_refresh_token (JTI novo)", type: "success" },
  { step: "Persistir JTI",             detail: "INSERT INTO refresh_tokens (id, jti, user_id)",       type: "action" },
  { step: "Repor rate limit",          detail: "Redis: DEL login_attempts:{fingerprint}",             type: "action" },
  { step: "Set-Cookie httpOnly",       detail: "access_token (15 min) + refresh_token (30 dias)",     type: "success" },
  { step: "Resposta 200",              detail: "{token_type, expires_in, user_id, role}",             type: "success" },
];

const REFRESH_FLOW: FlowStep[] = [
  { step: "POST /auth/refresh",        detail: "Ler refresh_token do cookie (ou body como fallback)", type: "action" },
  { step: "decode_token()",            detail: "Verificar assinatura JWT + expiração",                type: "check" },
  { step: "Verificar type='refresh'",  detail: "Rejeitar access tokens aqui",                         type: "check" },
  { step: "Verificar JTI na BD",       detail: "SELECT * FROM refresh_tokens WHERE jti=:jti AND revoked_at IS NULL", type: "check" },
  { step: "JTI revogado?",             detail: "Possível roubo de token → revogar todos os tokens do utilizador", type: "error" },
  { step: "Verificar pwd_hash_frag",   detail: "Senha mudou desde emissão? → rejeitar",              type: "check" },
  { step: "Revogar JTI antigo",        detail: "UPDATE refresh_tokens SET revoked_at=NOW() WHERE jti=:old_jti", type: "action" },
  { step: "Emitir novo token pair",    detail: "Novo access_token + refresh_token com novo JTI",      type: "success" },
  { step: "Set-Cookie httpOnly",       detail: "Substituir cookies anteriores",                        type: "success" },
];

const SECURITY_DECISIONS = [
  {
    titulo: "httpOnly Cookies, não localStorage",
    razao: "localStorage é acessível por qualquer JavaScript da página — risco XSS directo. Cookies httpOnly não são acessíveis por JS. O access_token tem path='/' e o refresh_token tem path='/api/v1/auth/refresh' para limitar a superfície de exposição.",
    alternativa: "Mobile nativo: aceitar tokens no body da resposta (RefreshRequest.refresh_token). Guardar em SecureStorage (iOS Keychain / Android Keystore).",
  },
  {
    titulo: "Refresh Token Rotation com detecção de reutilização",
    razao: "Cada refresh token é usado uma única vez. Se um JTI revogado for apresentado de novo, assume-se roubo de token e todos os tokens do utilizador são revogados. Este padrão é recomendado pelo RFC 6819 e pela Auth0.",
    alternativa: "Sem rotação: refresh tokens de longa duração ficam válidos mesmo após comprometimento.",
  },
  {
    titulo: "Invalidação de sessão por mudança de senha (pwd_hash_frag)",
    razao: "O JTI do access token não é armazenado na BD (seria demasiado custoso para tokens de curta duração). Em vez disso, os primeiros 8 chars do hash bcrypt são incluídos como claim. Quando a senha muda, o hash muda, o claim não corresponde, e todos os access tokens emitidos antes da mudança ficam inválidos imediatamente — sem lista negra.",
    alternativa: "Lista negra de JTIs em Redis: mais precisa mas requer uma consulta Redis por request.",
  },
  {
    titulo: "Rate Limiting por IP + e-mail (não só por IP)",
    razao: "Rate limiting apenas por IP falha em redes partilhadas (escritórios, hotéis). Rate limiting apenas por e-mail permite ataques de negação de serviço contra contas específicas. A combinação IP+e-mail equilibra protecção e disponibilidade.",
    alternativa: "CAPTCHA após 3 falhas: melhor experiência de utilizador mas mais complexidade de implementação.",
  },
  {
    titulo: "Facebook OAuth com httpx (sem authlib como dependência obrigatória)",
    razao: "O fluxo OAuth 2.0 Authorization Code é implementado directamente com httpx. authlib é suportado mas não obrigatório. O state parameter deve ser validado no callback (persistir em Redis com TTL de 10 min).",
    alternativa: "authlib tem suporte nativo para FastAPI e simplifica o código OAuth. Recomendado se o projecto crescer para mais providers (Google, Apple).",
  },
];

const STEP_COLORS: Record<string, string> = {
  action:  "border-l-blue-500 bg-blue-50",
  check:   "border-l-amber-500 bg-amber-50",
  error:   "border-l-red-500 bg-red-50",
  success: "border-l-green-500 bg-green-50",
};

const STEP_BADGES: Record<string, string> = {
  action:  "bg-blue-100 text-blue-700",
  check:   "bg-amber-100 text-amber-700",
  error:   "bg-red-100 text-red-700",
  success: "bg-green-100 text-green-700",
};

export default function AuthModule() {
  const [activeTab, setActiveTab] = useState("visao");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          Módulo de Autenticação
        </h1>
        <p className="text-muted-foreground">
          JWT · OAuth2 · RBAC · Rate Limiting · Refresh Token Rotation · Cookies httpOnly
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["FastAPI 0.100+", "Pydantic v2", "SQLAlchemy 2.0 async", "PyJWT", "bcrypt", "httpx", "Redis"].map(t => (
          <span key={t} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs rounded font-mono font-medium">{t}</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Fluxo de Login</h2>
              <ol className="space-y-2">
                {LOGIN_FLOW.map((s, i) => (
                  <li key={i} className={cn("border-l-4 pl-3 py-1.5 rounded-r", STEP_COLORS[s.type])}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded font-bold", STEP_BADGES[s.type])}>
                        {i + 1}
                      </span>
                      <code className="text-xs font-mono font-semibold text-foreground">{s.step}</code>
                    </div>
                    <p className="text-xs text-muted-foreground pl-7">{s.detail}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Fluxo de Refresh</h2>
              <ol className="space-y-2">
                {REFRESH_FLOW.map((s, i) => (
                  <li key={i} className={cn("border-l-4 pl-3 py-1.5 rounded-r", STEP_COLORS[s.type])}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded font-bold", STEP_BADGES[s.type])}>
                        {i + 1}
                      </span>
                      <code className="text-xs font-mono font-semibold text-foreground">{s.step}</code>
                    </div>
                    <p className="text-xs text-muted-foreground pl-7">{s.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Decisões de Arquitectura e Segurança</h2>
            <div className="space-y-4">
              {SECURITY_DECISIONS.map((d) => (
                <div key={d.titulo} className="bg-card border border-border rounded-lg p-5 shadow-sm">
                  <p className="font-semibold text-foreground mb-2">{d.titulo}</p>
                  <p className="text-sm text-muted-foreground mb-3">{d.razao}</p>
                  <div className="bg-secondary/50 rounded p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Alternativa</p>
                    <p className="text-xs text-muted-foreground">{d.alternativa}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Ficheiros do Módulo</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-auth-files">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-6 font-medium text-foreground">Ficheiro</th>
                    <th className="text-left py-2 pr-6 font-medium text-foreground">Responsabilidade</th>
                    <th className="text-left py-2 font-medium text-foreground">Dependências</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["app/core/security.py",      "JWT encode/decode, bcrypt, token_payload",       "PyJWT, passlib"],
                    ["app/core/rate_limit.py",    "Rate limiting por IP+e-mail com Redis",          "redis-py async"],
                    ["app/core/dependencies.py",  "get_current_user, require_role, cookie extractor","security.py"],
                    ["app/schemas/auth.py",       "Pydantic v2 schemas para todos os payloads auth", "pydantic v2"],
                    ["app/models/refresh_token.py","ORM model para JTI tracking",                   "SQLAlchemy 2.0"],
                    ["app/services/auth_service.py","Lógica de negócio: login, rotação, OAuth",     "httpx, security.py"],
                    ["app/routers/v1/auth.py",    "Rotas FastAPI, cookie management",               "auth_service.py"],
                    ["alembic/versions/0004_...", "Migração: tabela refresh_tokens + fb_provider_id","Alembic"],
                  ].map(([file, resp, deps]) => (
                    <tr key={file} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="py-2.5 pr-6 font-mono text-xs text-foreground">{file}</td>
                      <td className="py-2.5 pr-6 text-xs text-muted-foreground">{resp}</td>
                      <td className="py-2.5 text-xs font-mono text-muted-foreground">{deps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
