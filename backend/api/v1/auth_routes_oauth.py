# api/v1/auth_routes_oauth.py
# GENESIS — Google OAuth (MongoDB/Beanie)
#
# CHANGES (MongoDB Rebuild):
#   • All db_session()/SQLAlchemy → Beanie async queries
#   • Login session recorded after every successful OAuth login
#   • needs_name_setup=True for brand-new Google users
#   • Admin detection by ADMIN_EMAIL env var
#   • Redirect includes needs_name_setup flag for frontend routing

import os
import uuid
import logging
from datetime import datetime
from typing import Optional

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from database.models_mongo  import User, LoginSession
from security.jwt_handler   import create_token, create_refresh_token
from security.password_hash import hash_password

log = logging.getLogger(__name__)

oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

router = APIRouter(prefix='/auth', tags=['auth'])

_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")


@router.get('/google', summary='Redirect to Google OAuth')
async def google_login(request: Request):
    redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')
    if not redirect_uri:
        raise HTTPException(status_code=500, detail='GOOGLE_REDIRECT_URI not configured')
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get('/google/callback', summary='Google OAuth callback')
async def google_callback(request: Request):
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    client_ip    = request.client.host if request.client else "unknown"
    user_agent   = request.headers.get("user-agent", "")

    try:
        token     = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')

        if not user_info:
            raise HTTPException(status_code=400, detail='Failed to get user info from Google')

        email     = user_info['email']
        google_id = user_info['sub']
        name      = user_info.get('name', email.split('@')[0])
        picture   = user_info.get('picture')
        is_new    = False

        # Find by google_id → email → create
        user = await User.find_one(User.google_id == google_id)

        if not user:
            user = await User.find_one(User.email == email)
            if user:
                log.info(f'Linking Google account to existing user: {email}')
                user.google_id  = google_id
                user.avatar_url = picture
            else:
                # Auto-register
                username = name.replace(' ', '_').lower()
                base, counter = username, 1
                while await User.find_one(User.username == username):
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
                    needs_name_setup=True,
                )
                await user.insert()
                is_new = True

        # Admin detection
        if _ADMIN_EMAIL and email == _ADMIN_EMAIL:
            user.is_admin = True

        user.last_login = datetime.utcnow()
        await user.save()

        uid       = str(user.id)
        is_admin  = bool(user.is_admin)
        needs_ns  = bool(user.needs_name_setup)
        jti       = str(uuid.uuid4())

        access  = create_token(uid, is_admin=is_admin, jti=jti)
        refresh = create_refresh_token(uid, is_admin=is_admin)

        # Record login session
        await LoginSession(
            user_id=uid,
            user_email=email,
            user_name=user.display_name or user.username,
            login_method="google",
            ip_address=client_ip,
            user_agent=user_agent,
            jwt_jti=jti,
        ).insert()

        log.info(f'Google OAuth success: email={email} user_id={uid} new={is_new}')
        return RedirectResponse(
            url=(f'{frontend_url}/auth/callback'
                 f'?access_token={access}&refresh_token={refresh}'
                 f'&needs_name_setup={str(needs_ns).lower()}'),
            status_code=302,
        )

    except HTTPException:
        raise
    except Exception as e:
        log.error(f'Google OAuth callback error: {e}', exc_info=True)
        return RedirectResponse(url=f'{frontend_url}/login?error=oauth_failed', status_code=302)
