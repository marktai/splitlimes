# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import random, string, re

from django.shortcuts import render, get_object_or_404

# Create your views here.

from rest_framework import viewsets, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser

from django.contrib.auth.models import User, Group
from django.db import transaction
from django.conf import settings
from django.db.models import Q
from django.shortcuts import redirect
from django.http import Http404


from .serializers import *
from .models import *

import requests

class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseExpandedSerializer
    queryset = Expense.objects.all()

    @transaction.atomic
    def create(self, request):
        fields = {
            "name": request.data["name"],
            "group": Group.objects.get(id=request.data["group"]),
            "total_mills": request.data["total_mills"],
            "pay_json": request.data["pay_json"],
            "split_json": request.data["split_json"],
        }
        new_expense = Expense(**fields)
        new_expense.save()

        new_expense.update_user_splits(new_expense.pay_json, new_expense.split_json)

        return Response(ExpenseExpandedSerializer(new_expense).data)

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserExpandedSerializer
    queryset = User.objects.all()

class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupExpandedSerializer
    queryset = Group.objects.all()

class UserSplitExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = UserSplitExpenseSerializer
    queryset = UserSplitExpense.objects.all()
