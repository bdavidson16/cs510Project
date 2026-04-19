import unittest
from fastapi.testclient import TestClient

import app.db as db
import app.main as main


class DatabaseSecurityTests(unittest.TestCase):
    def test_replication_lag_retry_eventual_consistency(self):
        attempts = {"count": 0}
        sleeps = []
        original_check_row_exists = db.check_row_exists
        original_sleep = db.time.sleep

        def fake_check_row_exists(table, row_data):
            attempts["count"] += 1
            return attempts["count"] >= 3

        try:
            db.check_row_exists = fake_check_row_exists
            db.time.sleep = lambda value: sleeps.append(value)

            result = db.check_row_exists_with_retry(
                "cases", {"patient_id": "123"}, retries=4, delay_seconds=0.01
            )

            self.assertTrue(result)
            self.assertEqual(attempts["count"], 3)
            self.assertEqual(len(sleeps), 2)
        finally:
            db.check_row_exists = original_check_row_exists
            db.time.sleep = original_sleep

    def test_role_permission_allows_read_write_only(self):
        grants = [
            "GRANT SELECT, INSERT, UPDATE ON `vaccine_database`.* TO `app_user`@`%`",
            "GRANT USAGE ON *.* TO `app_user`@`%`",
        ]
        self.assertTrue(db.has_only_read_write_access(grants))

    def test_role_permission_rejects_dangerous_privileges(self):
        grants = [
            "GRANT SELECT, INSERT, UPDATE, DELETE ON `vaccine_database`.* TO `app_user`@`%`"
        ]
        self.assertFalse(db.has_only_read_write_access(grants))

    def test_get_current_user_grants_reads_show_grants(self):
        original_query_db = db.query_db
        try:
            db.query_db = lambda query, params: [
                ("GRANT SELECT, INSERT, UPDATE ON `vaccine_database`.* TO `app_user`@`%`",),
                ("GRANT USAGE ON *.* TO `app_user`@`%`",),
            ]
            grants = db.get_current_user_grants()
            self.assertEqual(len(grants), 2)
            self.assertTrue(grants[0].startswith("GRANT SELECT"))
        finally:
            db.query_db = original_query_db

    def test_sql_injection_identifier_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Invalid identifier"):
            db._validate_identifier("cases; DROP TABLE cases; --")

    def test_sql_injection_payload_value_uses_bound_parameter(self):
        captured = {}
        original_get_table_columns = db.get_table_columns
        original_check_row_exists = db.check_row_exists
        original_execute_db = db.execute_db

        def fake_execute_db(query, params):
            captured["query"] = str(query)
            captured["params"] = params

        try:
            db.get_table_columns = lambda table: ["patient_id"]
            db.check_row_exists = lambda table, row_data: True
            db.execute_db = fake_execute_db

            payload = {"patient_id": "1'; DROP TABLE cases; --"}
            inserted = db.add_row("cases", payload)

            self.assertEqual(inserted, payload)
            self.assertIn(":patient_id", captured["query"])
            self.assertEqual(captured["params"]["patient_id"], payload["patient_id"])
        finally:
            db.get_table_columns = original_get_table_columns
            db.check_row_exists = original_check_row_exists
            db.execute_db = original_execute_db

    def test_validation_rejects_empty_write_payload(self):
        with self.assertRaisesRegex(ValueError, "Row payload is empty"):
            db.add_row("cases", {})

    def test_validation_rejects_payload_without_valid_columns(self):
        original_get_table_columns = db.get_table_columns
        try:
            db.get_table_columns = lambda table: ["patient_id"]
            with self.assertRaisesRegex(ValueError, "No valid columns"):
                db.add_row("cases", {"not_a_column": "x"})
        finally:
            db.get_table_columns = original_get_table_columns

    def test_error_exposure_hides_database_details(self):
        original_check_db = main.check_db
        try:
            main.check_db = lambda: (_ for _ in ()).throw(
                Exception("SQLSTATE[42000] Access denied for user root password=secret")
            )
            client = TestClient(main.app)
            response = client.get("/api/db")
            self.assertEqual(response.status_code, 500)
            self.assertEqual(response.json()["detail"], main.GENERIC_DB_ERROR)
            self.assertNotIn("SQLSTATE", response.text)
            self.assertNotIn("password=secret", response.text)
            self.assertNotIn("root", response.text)
        finally:
            main.check_db = original_check_db


if __name__ == "__main__":
    unittest.main()
