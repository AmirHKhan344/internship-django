from django.db import models

class PurchaseOrder(models.Model):
    order_number = models.CharField(max_length=64)
    vendor       = models.CharField(max_length=128, blank=True)
    order_date   = models.DateField(null=True, blank=True)
    amount       = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.order_number} - {self.vendor}"

class CoalRecord(models.Model):
    record_date  = models.DateField()
    mine         = models.CharField(max_length=128, blank=True)
    quantity_t   = models.FloatField(null=True, blank=True)   # tons
    quality      = models.CharField(max_length=64, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.record_date} - {self.mine}"
