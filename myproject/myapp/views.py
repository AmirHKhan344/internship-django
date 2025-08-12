from django.shortcuts import render
from django.http import HttpResponse
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from pathlib import Path

def home(request):
    return render(request, "myapp/index.html")

def _save_files(files, subfolder):
    saved = []
    target = Path(settings.MEDIA_ROOT) / subfolder
    target.mkdir(parents=True, exist_ok=True)
    fs = FileSystemStorage(location=target)
    for f in files:
        name = fs.save(f.name, f)
        saved.append(str((Path(settings.MEDIA_URL) / subfolder / name).as_posix()))
    return saved

def upload_po(request):
    context = {}
    if request.method == "POST":
        files = request.FILES.getlist("files")
        print("FILES len:", len(files))  # <- watch terminal
        if files:
            context["saved"] = _save_files(files, "po")
            context["message"] = f"Uploaded {len(files)} file(s)."
    return render(request, "myapp/upload_po.html", context)


def upload_coal(request):
    context = {"saved": []}
    if request.method == "POST":
        files = request.FILES.getlist("files")   # <— name="files"
        if files:
            context["saved"] = _save_files(files, "coal")
            context["message"] = f"Uploaded {len(context['saved'])} file(s)."
    return render(request, "myapp/upload_coal.html", context)
