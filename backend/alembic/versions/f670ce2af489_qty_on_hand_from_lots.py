"""qty on hand from lots

Revision ID: f670ce2af489
Revises: a512b975fc8d
Create Date: 2026-10-15 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f670ce2af489'
down_revision: Union[str, Sequence[str], None] = 'a512b975fc8d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # คงเหลือคิดจากผลรวม qty_left ของล็อตตอนดึงข้อมูลแทน ไม่เก็บซ้ำ
    op.drop_constraint(op.f('ck_products_qty_on_hand'), 'products')
    op.drop_column('products', 'qty_on_hand')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('products', sa.Column('qty_on_hand', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False))
    op.execute("""
        update products p
        set qty_on_hand = coalesce((select sum(m.qty_left) from stock_movements m where m.product_id = p.id), 0)
    """)
    op.create_check_constraint(op.f('ck_products_qty_on_hand'), 'products', 'qty_on_hand >= 0')
