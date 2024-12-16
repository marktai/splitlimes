from django.db import models
import json, random, string, os

from django.db import models, transaction
from django_jsonform.models.fields import ArrayField

from rest_framework import exceptions as drf_exceptions
from datetime import datetime, timedelta, date
from dateutil import parser
import pytz
from django.db.models import Q
from django.db import transaction
from decimal import Decimal

# TODO(mark): implement currency conversion: https://fxratesapi.com/ and db caching

class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100)
    venmo = models.CharField(max_length=100, null=True)

    created_time = models.DateTimeField(auto_now_add=True)
    last_updated_time = models.DateTimeField(auto_now=True)

class Group(models.Model):
    name = models.CharField(max_length=100)
    # TODO(mark): implement unique slugs
    name_slug = models.CharField(max_length=20)
    users = models.ManyToManyField(User)

    created_time = models.DateTimeField(auto_now_add=True)
    last_updated_time = models.DateTimeField(auto_now=True)
    default_currency = models.CharField(max_length=3)

    @property
    def user_totals(self):
        user_totals = {}

        expenses = self.expense_set.all().prefetch_related('user_split_expense_set')

        # there's probably a cute reduce somehow
        for expense in expenses:
            for user_split_expense in expense.user_split_expense_set.all():
                user_totals.setdefault(user_split_expense.user.id, 0)
                user_totals[user_split_expense.user.id] += user_split_expense.net_portion_mills

        return user_totals

    @property
    # TODO(mark)
    def currencies(self):
        return []

    # TODO(mark): property of last expense update time
    @property
    def last_activity_time(self):
        return last_updated_time

# TODO(mark): update to be in localized currency
class Expense(models.Model):
    name = models.CharField(max_length=200)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    total_mills = models.IntegerField()
    currency = models.CharField(max_length=3)
    pay_json = models.JSONField() # same format as split_json
    split_json = models.JSONField()
    expense_date = models.DateField(default=date.today)

    created_time = models.DateTimeField(auto_now_add=True)
    last_updated_time = models.DateTimeField(auto_now=True)
    is_reimbursement = models.BooleanField(default=False)
    category = models.CharField(max_length=100)
    notes = models.CharField(max_length=1000)

    # split_json types
    # TODO(mark): JSON schemas
    """
    {
        "type": "equally"
        "users": [
            1,
            2,
            3
        ]
    }
    {
        "type": "exact_amounts",
        "users": {
            "1": 123245, # mills
            "2": 123134,
            "3": 132145
        }
    }
    {
        "type": "percentages",
        "users": {
            "1": "0.25",
            "2": "0.125",
            "3": "0.625"
        }
    }
    {
        "type": "shares",
        "users": {
            "1": "3",
            "2": "12.5",
            "3": "552.3"
        }
    }
    {
        "type": "adjustment",
        "users": {
            "1": 3000, # mills
            "2": -2000,
            "3": 4500
        }
    }
    {
        "type": "itemized_expense",
        "items": [
     {
                "name": "cheesebread",
                "price": 3000 # mills,
                # evenly split between all included users
                "users: [
                    1,
                    2,
                    3,
                ]
            }
        ]
    }
    """

    @staticmethod
    def calculate_split(total_mills, split_json, expense_id=None):
        num_users = 0
        user_splits = None

        if split_json['type'] == 'equally':
            num_users = len(split_json['users'])
            avg = total_mills // num_users
            user_splits = {u: avg for u in split_json['users']}
        elif split_json['type'] == 'exact_amounts':
            # after correction at the end, technically the same as adjustments
            num_users = len(split_json['users'])
            user_splits = {u: int(round(Decimal(v))) for u, v in split_json['users'].items()}
        elif split_json['type'] == 'percentages':
            num_users = len(split_json['users'])
            user_splits = {u: int(round(total_mills * Decimal(v))) for u, v in split_json['users'].items()}
        elif split_json['type'] == 'shares':
            num_users = len(split_json['users'])
            total_shares = sum([Decimal(d) for d in split_json['users'].values()])
            user_splits = {u: int(round(total_mills * Decimal(v) / total_shares)) for u, v in split_json['users'].items()}
        elif split_json['type'] == 'adjustments':
            num_users = len(split_json['users'])
            total_adjustment = sum([Decimal(d) for d in split_json['users'].values()])
            default = (total_mills - total_adjustment) // num_users
            user_splits = {u: int(default + v) for u, v in split_json['users'].items()}
        elif split_json['type'] == 'itemized_expenses':
            # TODO(mark): implement
            pass

        if user_splits is None:
            raise Exception("Unhandled split type: %s" % split_json['type'])

        # readjust splits by applying the average deviation between total and calculated total, then determinstically picking arbitrary users to pay 1 more
        calculated_total_mills = sum(user_splits.values())
        diff = total_mills - calculated_total_mills
        adjustment_per = diff // num_users
        closest_correct = calculated_total_mills + adjustment_per * num_users
        user_splits = {u: v + adjustment_per for u, v in user_splits.items()}
        number_of_unluckies = total_mills - closest_correct
        determinstic_arbitrary_unluckies = [u for (h, u) in sorted(
            [
                (
                    hash(str(expense_id) + str(user)),
                    user,
                ) for user in user_splits.keys()
            ]
        )][:number_of_unluckies]
        for u in determinstic_arbitrary_unluckies:
            user_splits[u] += 1

        assert sum(user_splits.values()) == total_mills, "total_mills argument and sum of output do not match; %d != %s" % (total_mills, repr(user_splits))

        return user_splits

    # TODO(mark): apply on save
    @transaction.atomic
    def update_user_splits(self, pay_json, split_json):
        previous_user_split_expenses = {user_split.user.id: user_split for user_split in self.user_split_expense_set.all()}
        user_pay_splits = self.calculate_split(self.total_mills, pay_json, self.id)
        user_owe_splits = self.calculate_split(self.total_mills, split_json, self.id)

        count_updated = 0
        for u in set(user_pay_splits.keys()) | set(user_owe_splits.keys()):
            if u in previous_user_split_expenses:
                previous_user_split_expenses[u].pay_portion_mills = user_pay_splits[u] 
                previous_user_split_expenses[u].owe_portion_mills = user_owe_splits[u] 
                previous_user_split_expenses[u].save()
                count_updated = 0
            else:
                UserSplitExpense(user_id=u, expense=self, pay_portion_mills=user_pay_splits.get(u, 0), owe_portion_mills=user_owe_splits.get(u, 0)).save()
        return count_updated
    
# derived data of expenses eagerly split by user
class UserSplitExpense(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='user_split_expense_set')
    pay_portion_mills = models.IntegerField()
    owe_portion_mills = models.IntegerField()

    created_time = models.DateTimeField(auto_now_add=True)
    last_updated_time = models.DateTimeField(auto_now=True)

    @property
    def net_portion_mills(self):
        return self.owe_portion_mills - self.pay_portion_mills

# TODO(add on all views)
class Activity(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    created_time = models.DateTimeField(auto_now_add=True)
    # activity_type
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    expense = models.ForeignKey(Expense, on_delete=models.SET_NULL, null=True)
    data = models.JSONField(null=True)

    class ActivityType(models.TextChoices):
        UPDATE_GROUP = 'UG'
        CREATE_EXPENSE = 'CE'
        UPDATE_EXPENSE = 'UE'
        DELETE_EXPENSE = 'DE'
    
    activity_type = models.CharField(
        max_length=2,
        choices=ActivityType.choices,
    )
