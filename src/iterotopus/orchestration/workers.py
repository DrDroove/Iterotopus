import asyncio

from iterotopus.models import Task


async def calculate_credit_risk(task: Task) -> None:
    """Имитация кредитного расчёта."""
    await asyncio.sleep(2.5)


async def calculate_market_risk(task: Task) -> None:
    """Имитация рыночного расчёта."""
    await asyncio.sleep(2.6)


async def calculate_operational_risk(task: Task) -> None:
    """Имитация операционного расчёта."""
    await asyncio.sleep(3)


CALCULATORS = {
    "credit": calculate_credit_risk,
    "market": calculate_market_risk,
    "operational": calculate_operational_risk,
}
