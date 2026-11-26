"""remove task priority

Revision ID: 5983dcc028f9
Revises: 56464af11774
Create Date: 2026-11-26 12:14:56.923320

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "5983dcc028f9"
down_revision: str | Sequence[str] | None = "56464af11774"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("tasks", "priority")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "tasks",
        sa.Column(
            "priority",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )

    op.alter_column(
        "tasks",
        "priority",
        server_default=None,
    )
