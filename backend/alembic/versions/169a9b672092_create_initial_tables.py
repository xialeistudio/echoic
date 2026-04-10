"""create initial tables

Revision ID: 169a9b672092
Revises: 
Create Date: 2026-04-07 19:18:42.577501

"""
from alembic import op
import sqlalchemy as sa


revision = '169a9b672092'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audio_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("storage_backend", sa.String(), nullable=False, server_default="local"),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("sentences", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_table(
        "practice_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("audio_file_id", sa.Integer(), nullable=False),
        sa.Column("sentence_index", sa.Integer(), nullable=False),
        sa.Column("sentence_text", sa.String(), nullable=False),
        sa.Column("storage_backend", sa.String(), nullable=False, server_default="local"),
        sa.Column("recording_path", sa.String(), nullable=False),
        sa.Column("accuracy_score", sa.Float(), nullable=True),
        sa.Column("fluency_score", sa.Float(), nullable=True),
        sa.Column("completeness_score", sa.Float(), nullable=True),
        sa.Column("word_scores", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["audio_file_id"], ["audio_files.id"]),
    )


def downgrade() -> None:
    op.drop_table("practice_records")
    op.drop_table("audio_files")
