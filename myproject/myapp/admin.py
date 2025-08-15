# myapp/admin.py
from django.contrib import admin
from .models import PurchaseOrder, CoalRecord
admin.site.register(PurchaseOrder)
admin.site.register(CoalRecord)
