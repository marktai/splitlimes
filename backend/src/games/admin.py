from django.contrib import admin
from django.utils.html import mark_safe
from . import models

# Register your models here.

# @admin.register(models.Game)
# class GameAdmin(admin.ModelAdmin):
#     fields = ('white_player', 'black_player', 'board_link', 'turn_count', 'created_time', 'last_updated_time')
#     readonly_fields = ('board', 'board_link', 'turn_count', 'created_time', 'last_updated_time')

#     def board_link(self, obj):
#         url = '../../../board/%d/change' % obj.board.id
#         return mark_safe('<a href="%s">%s</a>' % (url, obj.board.fen))


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