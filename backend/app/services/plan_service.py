from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.config import settings
from app.models.user import User


@dataclass(frozen=True)
class PlanLimits:
    max_groups: int | None
    max_requests: int | None
    max_file_size_mb: int | None


@dataclass(frozen=True)
class PlanDefinition:
    key: str
    name: str
    description: str
    price_usd: int | None
    interval_label: str | None
    cta_label: str
    cta_href: str | None
    highlighted: bool
    contact_only: bool
    internal: bool
    features: tuple[str, ...]
    limits: PlanLimits
    dodo_product_id: str | None = None


def _contact_href() -> str:
    if settings.contact_sales_url:
        return settings.contact_sales_url
    return f"mailto:{settings.contact_sales_email}?subject=Docufy%20Enterprise"


def get_plan_catalog() -> dict[str, PlanDefinition]:
    return {
        "trial": PlanDefinition(
            key="trial",
            name="Free",
            description="Free trial for testing extraction before you recharge.",
            price_usd=0,
            interval_label=None,
            cta_label="Current Trial",
            cta_href=None,
            highlighted=False,
            contact_only=False,
            internal=True,
            features=(
                "1 API group",
                "5 document extraction calls",
                "5 MB max document size",
            ),
            limits=PlanLimits(max_groups=1, max_requests=5, max_file_size_mb=5),
        ),
        "starter": PlanDefinition(
            key="starter",
            name="Starter",
            description="Recharge pack for smaller production workflows.",
            price_usd=20,
            interval_label=None,
            cta_label="Buy Starter",
            cta_href=None,
            highlighted=False,
            contact_only=False,
            internal=False,
            features=(
                "5 API groups",
                "750 document extraction calls",
                "5 MB max document size",
            ),
            limits=PlanLimits(max_groups=5, max_requests=750, max_file_size_mb=5),
            dodo_product_id=settings.dodo_starter_product_id,
        ),
        "growth": PlanDefinition(
            key="growth",
            name="Growth",
            description="Recharge pack for growing API usage.",
            price_usd=49,
            interval_label=None,
            cta_label="Buy Growth",
            cta_href=None,
            highlighted=True,
            contact_only=False,
            internal=False,
            features=(
                "10 API groups",
                "2000 document extraction calls",
                "10 MB max document size",
                "Recharge anytime when credits end",
            ),
            limits=PlanLimits(max_groups=10, max_requests=2_000, max_file_size_mb=10),
            dodo_product_id=settings.dodo_growth_product_id,
        ),
        "scale": PlanDefinition(
            key="scale",
            name="Scale",
            description="Recharge pack for high-volume extraction.",
            price_usd=199,
            interval_label=None,
            cta_label="Buy Scale",
            cta_href=None,
            highlighted=False,
            contact_only=False,
            internal=False,
            features=(
                "20 API groups",
                "10,000 document extraction calls",
                "25 MB max document size",
            ),
            limits=PlanLimits(max_groups=20, max_requests=10_000, max_file_size_mb=25),
            dodo_product_id=settings.dodo_scale_product_id,
        ),
        "contact": PlanDefinition(
            key="contact",
            name="Contact",
            description="Custom",
            price_usd=None,
            interval_label=None,
            cta_label="Contact Sales",
            cta_href=_contact_href(),
            highlighted=False,
            contact_only=True,
            internal=False,
            features=(
                "Custom rollout",
            ),
            limits=PlanLimits(max_groups=None, max_requests=None, max_file_size_mb=None),
        ),
    }


def get_plan(plan_key: str | None) -> PlanDefinition:
    catalog = get_plan_catalog()
    if plan_key and plan_key in catalog:
        return catalog[plan_key]
    return catalog["trial"]


def get_public_plans() -> list[PlanDefinition]:
    return [plan for plan in get_plan_catalog().values() if not plan.internal]


def resolve_plan_from_product_id(product_id: str | None) -> PlanDefinition | None:
    if not product_id:
        return None

    for plan in get_plan_catalog().values():
        if plan.dodo_product_id and plan.dodo_product_id == product_id:
            return plan

    return None


def get_effective_plan(user: User, now: datetime | None = None) -> PlanDefinition:
    del now
    return get_plan(user.plan_key)
