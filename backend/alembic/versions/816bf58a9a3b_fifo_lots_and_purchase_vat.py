"""fifo lots and purchase vat

Revision ID: 816bf58a9a3b
Revises: 761707f2f63a
Create Date: 2026-10-14 08:53:56.088071

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '816bf58a9a3b'
down_revision: Union[str, Sequence[str], None] = '761707f2f63a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ใบรับของเก่ากรอกยอดจ่ายจริงที่รวม VAT ไว้แล้ว จึงให้อัตราเป็น 0 ใบใหม่ระบบใส่อัตรา ณ วันรับเอง
    op.add_column('goods_receipts', sa.Column('vat_rate', sa.Numeric(precision=5, scale=2), server_default='0', nullable=False))
    op.alter_column('goods_receipts', 'vat_rate', server_default=None)
    op.drop_column('products', 'avg_cost')
    op.add_column('stock_movements', sa.Column('qty_left', sa.Numeric(precision=12, scale=2), nullable=True))
    # ของที่เหลือตอนนี้นับว่าอยู่ในล็อตใหม่สุด (ของเก่าถูกตัดออกไปก่อนตาม FIFO)
    op.execute("""
        update stock_movements m
        set qty_left = greatest(0, least(m.qty, p.qty_on_hand - coalesce((
            select sum(n.qty) from stock_movements n
            where n.product_id = m.product_id and n.qty > 0 and n.id > m.id
        ), 0)))
        from products p
        where p.id = m.product_id and m.qty > 0
    """)
    op.create_check_constraint(
        op.f('ck_stock_movements_qty_left'),
        'stock_movements',
        '(qty < 0 and qty_left is null) or (qty > 0 and qty_left >= 0 and qty_left <= qty)',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('ck_stock_movements_qty_left'), 'stock_movements')
    op.drop_column('stock_movements', 'qty_left')
    op.add_column('products', sa.Column('avg_cost', sa.NUMERIC(precision=12, scale=2), server_default=sa.text("'0'::numeric"), autoincrement=False, nullable=False))
    op.create_check_constraint(op.f('ck_products_avg_cost'), 'products', 'avg_cost >= 0')
    op.drop_column('goods_receipts', 'vat_rate')
