from django.shortcuts import render
from django.http import HttpResponseBadRequest
from django.conf import settings
from django.db import transaction
from django.core.files.storage import FileSystemStorage
from pathlib import Path
import pandas as pd
from .models import PurchaseOrder, CoalRecord

MEDIA_PO   = Path(settings.MEDIA_ROOT) / "po"
MEDIA_COAL = Path(settings.MEDIA_ROOT) / "coal"
MEDIA_PO.mkdir(parents=True, exist_ok=True)
MEDIA_COAL.mkdir(parents=True, exist_ok=True)

def home(request):
    return render(request, "myapp/index.html")

def _read_table(uploaded_file):
    """Return a pandas DataFrame from xlsx/xls/csv."""
    name = uploaded_file.name.lower()
    if name.endswith((".xlsx", ".xls")):
        return pd.read_excel(uploaded_file)           # openpyxl handles xlsx
    if name.endswith(".csv"):
        return pd.read_csv(uploaded_file)
    raise ValueError("Unsupported file type (use .xlsx, .xls, or .csv)")

def _norm_cols(df, mapping):
    """Map any of several possible column headers to canonical names."""
    cols = {c.strip().lower(): c for c in df.columns}
    chosen = {}
    for canon, candidates in mapping.items():
        for cand in candidates:
            key = cand.lower()
            if key in cols:
                chosen[canon] = cols[key]
                break
    return df.rename(columns=chosen)

def upload_po(request):
    context = {"saved": [], "rows_inserted": 0, "errors": []}
    if request.method == "POST":
        files = request.FILES.getlist("files")
        if not files:
            return HttpResponseBadRequest("No files provided")

        for f in files:
            # Save a copy
            fs = FileSystemStorage(location=MEDIA_PO)
            saved_name = fs.save(f.name, f)
            context["saved"].append(str((Path(settings.MEDIA_URL) / "po" / saved_name).as_posix()))

            # Load and insert rows
            try:
                df = _read_table(f)
                # Map flexible headers -> canonical
                df = _norm_cols(df, {
                    "order_number": ["order_number", "po number", "po_no", "po"],
                    "vendor":       ["vendor", "supplier", "vendor_name"],
                    "order_date":   ["order_date", "date", "po_date"],
                    "amount":       ["amount", "total", "value"],
                })

                # Keep only relevant columns; missing ones become NaN
                keep = ["order_number", "vendor", "order_date", "amount"]
                for col in keep:
                    if col not in df.columns:
                        df[col] = None
                df = df[keep].dropna(subset=["order_number"])   # require order_number

                # Convert types safely
                df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce").dt.date
                df["amount"]     = pd.to_numeric(df["amount"], errors="coerce")

                with transaction.atomic():
                    objs = [
                        PurchaseOrder(
                            order_number=str(r.order_number).strip(),
                            vendor=(str(r.vendor).strip() if pd.notna(r.vendor) else ""),
                            order_date=r.order_date if pd.notna(r.order_date) else None,
                            amount=r.amount if pd.notna(r.amount) else None,
                        )
                        for r in df.itertuples(index=False)
                    ]
                    PurchaseOrder.objects.bulk_create(objs, ignore_conflicts=True)
                    context["rows_inserted"] += len(objs)

            except Exception as e:
                context["errors"].append(f"{f.name}: {e}")

        context["message"] = f"Uploaded {len(context['saved'])} file(s), inserted {context['rows_inserted']} PO rows."
    return render(request, "myapp/upload_po.html", context)

def upload_coal(request):
    context = {"saved": [], "rows_inserted": 0, "errors": []}
    if request.method == "POST":
        files = request.FILES.getlist("files")
        if not files:
            return HttpResponseBadRequest("No files provided")

        for f in files:
            fs = FileSystemStorage(location=MEDIA_COAL)
            saved_name = fs.save(f.name, f)
            context["saved"].append(str((Path(settings.MEDIA_URL) / "coal" / saved_name).as_posix()))

            try:
                df = _read_table(f)
                df = _norm_cols(df, {
                    "record_date": ["record_date", "date", "coal_date"],
                    "mine":        ["mine", "site", "location"],
                    "quantity_t":  ["quantity_t", "quantity", "qty", "tons", "tonnage"],
                    "quality":     ["quality", "grade", "calorific_value"],
                })

                keep = ["record_date", "mine", "quantity_t", "quality"]
                for col in keep:
                    if col not in df.columns:
                        df[col] = None
                df = df[keep].dropna(subset=["record_date"])     # require a date

                df["record_date"] = pd.to_datetime(df["record_date"], errors="coerce").dt.date
                df["quantity_t"]  = pd.to_numeric(df["quantity_t"], errors="coerce")

                with transaction.atomic():
                    objs = [
                        CoalRecord(
                            record_date=r.record_date,
                            mine=(str(r.mine).strip() if pd.notna(r.mine) else ""),
                            quantity_t=(float(r.quantity_t) if pd.notna(r.quantity_t) else None),
                            quality=(str(r.quality).strip() if pd.notna(r.quality) else ""),
                        )
                        for r in df.itertuples(index=False)
                        if pd.notna(r.record_date)
                    ]
                    CoalRecord.objects.bulk_create(objs, ignore_conflicts=True)
                    context["rows_inserted"] += len(objs)

            except Exception as e:
                context["errors"].append(f"{f.name}: {e}")

        context["message"] = f"Uploaded {len(context['saved'])} file(s), inserted {context['rows_inserted']} coal rows."
    return render(request, "myapp/upload_coal.html", context)
