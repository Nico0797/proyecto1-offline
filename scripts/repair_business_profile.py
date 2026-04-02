import os
import sys

from sqlalchemy import CheckConstraint, Column, Integer, MetaData, Table, Text, create_engine, inspect, select


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import Config


metadata = MetaData()
business_profile = Table(
    "business_profile",
    metadata,
    Column("id", Integer, primary_key=True, nullable=False),
    Column("business_name", Text, nullable=False, server_default=""),
    Column("phone", Text, nullable=True, server_default=""),
    Column("tax_id", Text, nullable=True, server_default=""),
    Column("address", Text, nullable=True, server_default=""),
    Column("message", Text, nullable=True, server_default=""),
    Column("updated_at", Text, nullable=True, server_default=""),
    CheckConstraint("id = 1", name="business_profile_id_check"),
)


def main():
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    inspector = inspect(engine)

    with engine.begin() as connection:
        if not inspector.has_table("business_profile"):
            business_profile.create(bind=connection, checkfirst=True)
            print("created_table=business_profile")
        else:
            print("created_table=skipped")

        row = connection.execute(select(business_profile.c.id).where(business_profile.c.id == 1)).fetchone()
        if not row:
            connection.execute(
                business_profile.insert().values(
                    id=1,
                    business_name="",
                    phone="",
                    tax_id="",
                    address="",
                    message="",
                    updated_at="",
                )
            )
            print("seeded_row=id:1")
        else:
            print("seeded_row=skipped")

    refreshed_inspector = inspect(engine)
    print("has_business_profile=", refreshed_inspector.has_table("business_profile"))
    if refreshed_inspector.has_table("business_profile"):
        columns = refreshed_inspector.get_columns("business_profile")
        print("columns=", [(column["name"], str(column["type"]), column.get("nullable")) for column in columns])


if __name__ == "__main__":
    main()
