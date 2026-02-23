from datetime import datetime
from backend.database import db


def ensure_membership_active(user):
    if not user:
        return
    if user.plan == "pro" and getattr(user, "membership_end", None):
        if user.membership_end < datetime.utcnow():
            user.plan = "free"
            db.session.commit()

