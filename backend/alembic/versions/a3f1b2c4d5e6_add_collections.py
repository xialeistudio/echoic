"""add collections

Revision ID: a3f1b2c4d5e6
Revises: 5cce4f7e6bb7
Create Date: 2026-04-13 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a3f1b2c4d5e6'
down_revision = '5cce4f7e6bb7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'collections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.add_column('audio_files', sa.Column('collection_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_audio_files_collection_id',
        'audio_files', 'collections',
        ['collection_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_audio_files_collection_id', 'audio_files', type_='foreignkey')
    op.drop_column('audio_files', 'collection_id')
    op.drop_table('collections')
