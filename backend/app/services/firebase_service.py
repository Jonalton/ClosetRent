import json
import firebase_admin
from firebase_admin import credentials, auth
from app.config import settings


def _initialize_firebase():
    if not firebase_admin._apps:
        sa_json = settings.FIREBASE_SERVICE_ACCOUNT_JSON
        if sa_json and sa_json != "{}":
            cred = credentials.Certificate(json.loads(sa_json))
        else:
            cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)


_initialize_firebase()


class FirebaseService:
    def verify_id_token(self, token: str) -> dict:
        try:
            decoded = auth.verify_id_token(token)
            return decoded
        except Exception as e:
            raise ValueError(f"Invalid Firebase token: {e}")

    def get_user(self, uid: str) -> auth.UserRecord:
        return auth.get_user(uid)


firebase_service = FirebaseService()
