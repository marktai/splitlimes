from django.contrib import admin
from django.utils.html import mark_safe
from . import models

# Register your models here.

@admin.register(models.Expense)
class ExpenseAdmin(admin.ModelAdmin):
    pass

@admin.register(models.User)
class UserAdmin(admin.ModelAdmin):
    pass

@admin.register(models.UserSplitExpense)
class UserSplitExpenseAdmin(admin.ModelAdmin):
    pass

@admin.register(models.Group)
class GroupAdmin(admin.ModelAdmin):
    pass