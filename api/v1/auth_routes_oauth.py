# ── api/v1/auth_routes_oauth.py ───────────────────────────────────────────────
# Drop-in additions for Google OAuth. Merge into your existing auth_routes.py
#
# Prerequisites:
#   pip install authlib httpx itsdangerous
#
# .env additions:
#   GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
#   GOOGLE_CLIENT_SECRET=your-secret
#   GOOGLE_REDIRECT_URI=https://your-api.railway.app/api/v1/auth/google/callback
#   FRONTEND_URL=https://your-frontend.railway.app
#   SESSION_SECRET_KEY=generate-a-random-32-char-hex-string
#
# database/models.py — add to User model:
#   google_id  = Column(String(64), unique=True, nullable=True, index=True)
#   avatar_url = Column(String(512), nullable=True)
#
# After adding columns run:
#   alembic revision --autogenerate -m "add_google_oauth"
#   alembic upgrade head
#
# api/main.py — add Starlette session middleware BEFORE all routes:
#   from starlette.middleware.sessions import SessionMiddleware
#   app.add_middleware(
#       SessionMiddleware,
#       secret_key=os.getenv("SESSION_SECRET_KEY", "dev-fallback"),
#       same_site="lax",
#       https_only=os.getenv("ENV", "development") == "production",
#   )

import os
import time
import logging

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from database.db import db_session
from database.models import User
from security.jwt_handler import create_token, create_refresh_token
from security.password_hash import hash_password

log = logging.getLogger(__name__)

# ── OAuth client setup ────────────────────────────────────────────────────────
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

router = APIRouter(prefix='/auth', tags=['auth'])

# ── Step 1: Redirect to Google ────────────────────────────────────────────────
@router.get('/google', summary='Redirect to Google OAuth')
async def google_login(request: Request):
    """Initiates the Google OAuth2 flow."""
    redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')
    if not redirect_uri:
        raise HTTPException(status_code=500, detail='GOOGLE_REDIRECT_URI not configured')
    return await oauth.google.authorize_redirect(request, redirect_uri)


# ── Step 2: Handle callback ───────────────────────────────────────────────────
@router.get('/google/callback', summary='Google OAuth callback')
async def google_callback(request: Request):
    """
    Handles the Google OAuth2 callback.
    - Finds existing user by google_id OR email (links accounts).
    - Auto-registers new Google users.
    - Redirects to frontend with JWT tokens in query params.
    """
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')

    try:
        token     = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')

        if not user_info:
            log.warning('Google OAuth: no userinfo in token response')
            raise HTTPException(status_code=400, detail='Failed to get user info from Google')

        email     = user_info['email']
        google_id = user_info['sub']
        name      = user_info.get('name', email.split('@')[0])
        picture   = user_info.get('picture')

        with db_session() as db:
            # 1. Try to find by google_id
            user = db.query(User).filter_by(google_id=google_id).first()

            if not user:
                # 2. Try to find by email (link existing account)
                user = db.query(User).filter_by(email=email).first()
                if user:
                    log.info(f'Linking Google account to existing user: {email}')
                    user.google_id  = google_id
                    user.avatar_url = picture
                else:
                    # 3. Auto-register new user
                    username = name.replace(' ', '_').lower()
                    # Deduplicate username
                    base = username
                    counter = 1
                    while db.query(User).filter_by(username=username).first():
                        username = f'{base}_{counter}'
                        counter += 1

                    log.info(f'Auto-registering Google user: {email} as {username}')
                    user = User(
                        username=username,
                        email=email,
                        google_id=google_id,
                        avatar_url=picture,
                        hashed_pw=hash_password(os.urandom(32).hex()),
                        is_active=True,
                        is_admin=False,
                    )
                    db.add(user)
                    db.flush()  # Get the user.id

            user.last_login = time.time()
            uid      = user.id
            is_admin = user.is_admin

        access  = create_token(uid, is_admin=is_admin)
        refresh = create_refresh_token(uid, is_admin=is_admin)

        log.info(f'Google OAuth success: email={email} user_id={uid}')
        return RedirectResponse(
            url=f'{frontend_url}/auth/callback?access_token={access}&refresh_token={refresh}',
            status_code=302,
        )

    except HTTPException:
        raise
    except Exception as e:
        log.error(f'Google OAuth callback error: {e}', exc_info=True)
        return RedirectResponse(
            url=f'{frontend_url}/login?error=oauth_failed',
            status_code=302,
        )
