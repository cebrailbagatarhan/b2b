"""Summarize the existing admin catalog-readiness CSV export offline.

Usage: python scripts/catalog_audit.py kanal-hazirlik-2026-10-26.csv --json
No database access, imports or catalog changes are performed.
"""
import argparse
from collections import Counter
import csv
import json
from pathlib import Path

CHANNEL_COLUMNS = {
    "B2B": ("B2B Hazırlık Durumu", "B2B Engelleyici Kodları"),
    "B2C": ("B2C Hazırlık Durumu", "B2C Engelleyici Kodları"),
    "MARKETPLACE": ("Pazaryeri Hazırlık Durumu", "Pazaryeri Engelleyici Kodları"),
}


def summarize_csv(source):
    """Read exported rows incrementally and count readiness and blockers."""
    reader = csv.DictReader(source)
    expected = {name for columns in CHANNEL_COLUMNS.values() for name in columns}
    if reader.fieldnames is None or not expected.issubset(reader.fieldnames):
        raise ValueError("Bu dosya kanal hazırlık CSV başlıklarını içermiyor")
    if len(reader.fieldnames) != len(set(reader.fieldnames)):
        raise ValueError("Tekrarlanan CSV sütun başlığı")
    report = {
        "products": 0,
        "channels": {
            channel: {"ready": 0, "blocked": 0, "ready_percent": 0.0, "blockers": {}}
            for channel in CHANNEL_COLUMNS
        },
    }
    counts = {channel: Counter() for channel in CHANNEL_COLUMNS}
    for row in reader:
        if None in row or any(value is None for value in row.values()):
            raise ValueError(f"Bozuk CSV satırı: {reader.line_num}")
        report["products"] += 1
        for channel, (status_column, blockers_column) in CHANNEL_COLUMNS.items():
            status = row[status_column].strip()
            if status not in ("HAZIR", "ENGELLİ"):
                raise ValueError(f"Geçersiz {channel} hazırlık durumu, satır {reader.line_num}")
            key = "ready" if status == "HAZIR" else "blocked"
            report["channels"][channel][key] += 1
            codes = {code.strip() for code in row[blockers_column].split("|") if code.strip()}
            counts[channel].update(codes)
    for channel, counter in counts.items():
        summary = report["channels"][channel]
        summary["ready_percent"] = round(100 * summary["ready"] / report["products"], 1) if report["products"] else 0.0
        summary["blockers"] = dict(sorted(counter.items(), key=lambda item: (-item[1], item[0])))
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description="Katalog hazırlık CSV dosyasını çevrimdışı özetle")
    parser.add_argument("csv_path", type=Path, help="Yönetim panelinden indirilen CSV")
    parser.add_argument("--json", action="store_true", help="Makine tarafından okunabilir çıktı")
    parser.add_argument("--channel", choices=CHANNEL_COLUMNS, help="Yalnız bir kanalı göster")
    parser.add_argument("--top", type=int, default=10, help="Gösterilecek engelleyici sayısı")
    args = parser.parse_args(argv)
    if args.top < 1:
        parser.error("--top en az 1 olmalı")
    try:
        with args.csv_path.open(encoding="utf-8-sig", newline="") as source:
            report = summarize_csv(source)
    except (OSError, UnicodeError, csv.Error, ValueError) as error:
        parser.exit(1, f"Katalog raporu okunamadı: {error}\n")
    if args.channel:
        report["channels"] = {args.channel: report["channels"][args.channel]}
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(f"Analiz edilen ürün: {report['products']}")
        for channel, summary in report["channels"].items():
            print(f"{channel}: {summary['ready']} hazır, {summary['blocked']} engelli (%{summary['ready_percent']:.1f} hazır)")
            for code, count in list(summary["blockers"].items())[:args.top]:
                print(f"  {code}: {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
