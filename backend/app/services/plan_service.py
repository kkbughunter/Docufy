from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from app.config import settings
from app.models.user import User


@dataclass(frozen=True)
class PlanLimits:
    max_groups: int | None
    max_monthly_requests: int | None
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
            name="Trial",
            description="Starter sandbox for evaluating Docufy before you move onto a paid plan.",
            price_usd=0,
            interval_label="forever",
            cta_label="Current Trial",
            cta_href=None,
            highlighted=False,
            contact_only=False,
            internal=True,
            features=(
                "1 API group",
                "25 extraction calls per month",
                "5 MB max document size",
            ),
            limits=PlanLimits(max_groups=1, max_monthly_requests=25, max_file_size_mb=5),
        ),
        "starter": PlanDefinition(
            key="starter",
            name="Starter",
            description="For small teams shipping production document APIs in USD billing.",
            price_usd=29,
            interval_label="month",
            cta_label="Start Starter",
            cta_href=None,
            highlighted=False,
            contact_only=False,
            internal=False,
            features=(
                "3 API groups",
                "500 extraction calls per month",
                "10 MB max document size",
                "Hosted checkout with Dodo Payments",
            ),
            limits=PlanLimits(max_groups=3, max_monthly_requests=500, max_file_size_mb=10),
            dodo_product_id=settings.dodo_starter_product_id,
        ),
        "growth": PlanDefinition(
            key="growth",
            name="Growth",
            description="For operators juggling multiple document families and steady API volume.",
            price_usd=79,
            interval_label="month",
            cta_label="Start Growth",
            cta_href=None,
            highlighted=True,
            contact_only=False,
            internal=False,
            features=(
                "10 API groups",
                "2,500 extraction calls per month",
                "20 MB max document size",
                "Priority billing support",
            ),
            limits=PlanLimits(max_groups=10, max_monthly_requests=2_500, max_file_size_mb=20),
            dodo_product_id=settings.dodo_growth_product_id,
        ),
        "scale": PlanDefinition(
            key="scale",
            name="Scale",
            description="For production-heavy teams that want room for larger intake pipelines.",
            price_usd=199,
            interval_label="month",
            cta_label="Start Scale",
            cta_href=None,
            highlighted=False,
            contact_only=False,
            internal=False,
            features=(
                "30 API groups",
                "10,000 extraction calls per month",
                "25 MB max document size",
                "Customer portal access",
            ),
            limits=PlanLimits(max_groups=30, max_monthly_requests=10_000, max_file_size_mb=25),
            dodo_product_id=settings.dodo_scale_product_id,
        ),
        "contact": PlanDefinition(
            key="contact",
            name="Contact",
            description="For higher volumes, compliance reviews, or custom rollout requirements.",
            price_usd=None,
            interval_label=None,
            cta_label="Contact Sales",
            cta_href=_contact_href(),
            highlighted=False,
            contact_only=True,
            internal=False,
            features=(
                "Custom throughput",
                "Custom onboarding",
                "Custom support terms",
                "Implementation planning",
            ),
            limits=PlanLimits(max_groups=None, max_monthly_requests=None, max_file_size_mb=None),
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
    current_time = now or datetime.now(UTC)
    current_plan = get_plan(user.plan_key)

    if current_plan.key == "trial":
        return current_plan

    if user.billing_period_end and user.billing_period_end <= current_time:
        if user.billing_status in {"cancelled", "expired", "failed"}:
            return get_plan("trial")

    return current_plan
