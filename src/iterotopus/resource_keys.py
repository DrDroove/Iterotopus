from datetime import date

from sqlmodel import Session

from iterotopus.models import ResourcePolicy


class UnknownProcess(Exception):
    def __init__(self, process_type: str):
        self.process_type = process_type
        super().__init__(f"Unknown process type: {process_type}")


def get_resource_key(session: Session, source: str, business_date: date) -> str:
    policy = session.get(ResourcePolicy, source)
    scope = policy.lock_scope if policy else "GLOBAL"
    if scope == "GLOBAL":
        return f"source:{source}"
    return f"source:{source}:{business_date.isoformat()}"


def build_resource_keys(
    session: Session,
    process_type: str,
    business_date: date,
    sources: list[str],
) -> list[str]:
    keys = [get_resource_key(session, s, business_date) for s in sources]
    keys.append(f"output:{process_type}:{business_date.isoformat()}")
    return sorted(keys)
