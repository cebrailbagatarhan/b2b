import contextlib
import csv
import io
import json
import tempfile
import unittest
from pathlib import Path

from scripts.catalog_audit import main, summarize_csv

HEADERS = [
    "Ürün ID",
    "B2B Hazırlık Durumu", "B2B Engelleyici Kodları",
    "B2C Hazırlık Durumu", "B2C Engelleyici Kodları",
    "Pazaryeri Hazırlık Durumu", "Pazaryeri Engelleyici Kodları",
]


def sample_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(HEADERS)
    writer.writerow(["1", "HAZIR", "", "ENGELLİ", "HTTPS_IMAGE_MISSING", "ENGELLİ", "BARCODE_NOT_MODELED | VAT_RATE_NOT_MODELED"])
    writer.writerow(["2", "ENGELLİ", "TRY_PRICE_MISSING", "ENGELLİ", "TRY_PRICE_MISSING | HTTPS_IMAGE_MISSING", "ENGELLİ", "BARCODE_NOT_MODELED | TRY_PRICE_MISSING"])
    return output.getvalue()


class CatalogAuditTests(unittest.TestCase):
    def test_channel_counts_and_blocker_frequencies(self):
        report = summarize_csv(io.StringIO(sample_csv()))
        self.assertEqual(report["products"], 2)
        self.assertEqual(report["channels"]["B2B"]["ready"], 1)
        self.assertEqual(report["channels"]["B2B"]["blocked"], 1)
        self.assertEqual(report["channels"]["B2C"]["blockers"]["HTTPS_IMAGE_MISSING"], 2)
        self.assertEqual(report["channels"]["MARKETPLACE"]["blockers"]["BARCODE_NOT_MODELED"], 2)

    def test_ready_percent_by_channel_and_empty_export(self):
        report = summarize_csv(io.StringIO(sample_csv()))
        self.assertEqual(report["channels"]["B2B"]["ready_percent"], 50.0)
        self.assertEqual(report["channels"]["B2C"]["ready_percent"], 0.0)
        self.assertEqual(report["channels"]["MARKETPLACE"]["ready_percent"], 0.0)

        empty = summarize_csv(io.StringIO(",".join(HEADERS) + "\n"))
        self.assertEqual(empty["products"], 0)
        for summary in empty["channels"].values():
            self.assertEqual(summary["ready_percent"], 0.0)

    def test_cli_text_shows_readiness_percentage(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "catalog.csv"
            path.write_text(sample_csv(), encoding="utf-8")
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                self.assertEqual(main([str(path), "--channel", "B2B"]), 0)
            self.assertIn("%50.0 hazır", output.getvalue())

    def test_accepts_bom_and_quoted_delimiters(self):
        content = sample_csv().replace("BARCODE_NOT_MODELED | VAT_RATE_NOT_MODELED", "BARCODE_NOT_MODELED | VAT_RATE_NOT_MODELED")
        report = summarize_csv(io.StringIO(content.lstrip("\ufeff")))
        self.assertEqual(report["products"], 2)

    def test_rejects_missing_headers(self):
        with self.assertRaisesRegex(ValueError, "başlık"):
            summarize_csv(io.StringIO("Ürün ID,Stok Kodu\n1,SKU\n"))

    def test_rejects_invalid_status_and_extra_columns(self):
        with self.assertRaisesRegex(ValueError, "Geçersiz"):
            summarize_csv(io.StringIO(sample_csv().replace("HAZIR", "UNKNOWN")))
        with self.assertRaisesRegex(ValueError, "Bozuk"):
            summarize_csv(io.StringIO(sample_csv() + "1,2,3,4,5,6,7,8\n"))

    def test_json_cli_from_utf8_bom_export(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "catalog.csv"
            path.write_text("\ufeff" + sample_csv(), encoding="utf-8")
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                self.assertEqual(main([str(path), "--json", "--channel", "B2B"]), 0)
            report = json.loads(output.getvalue())
            self.assertEqual(report["products"], 2)
            self.assertEqual(list(report["channels"]), ["B2B"])


if __name__ == "__main__":
    unittest.main()
