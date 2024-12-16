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
from django.utils.text import slugify

from .serializers import *
from .models import *

import requests

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserExpandedSerializer
    queryset = User.objects.all()

class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupExpandedSerializer
    queryset = Group.objects.all()
    
    # allow slugs instead of ids
    def get_object(self):
        if self.kwargs['pk'].isdigit():
            obj = self.queryset.get(pk = self.kwargs['pk'])
        else:
            obj = self.queryset.get(name_slug = self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj

    def create(self, request):
        fields = {
            "name": request.data["name"],
            "default_currency": request.data["default_currency"],
        }

        slug_suffix = ""
        while True:
            name_slug = slugify(fields["name"]) + slug_suffix
            if Group.objects.filter(name_slug=name_slug).exists():
                # unary counting :D
                slug_suffix += "_1"
            else:
                break

        fields["name_slug"] = name_slug

        new_group = Group(**fields)
        new_group.save()

        return Response(self.serializer_class(new_group).data)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseExpandedSerializer
    queryset = Expense.objects.all()

    @transaction.atomic
    def create(self, request):
        fields = {
            "name": request.data["name"],
            "group": Group.objects.get(id=request.data["group"]),
            "total_mills": request.data["total_mills"],
            "currency": request.data["currency"],
            "pay_json": request.data["pay_json"],
            "split_json": request.data["split_json"],
            "expense_date": request.data["expense_date"],
            "is_reimbursement": request.data.get("is_reimbursement", False),
            "notes": request.data.get("notes", ""),
        }
        new_expense = Expense(**fields)
        new_expense.save()

        new_expense.update_user_splits(new_expense.pay_json, new_expense.split_json)

        return Response(self.serializer_class(new_expense).data)

class UserSplitExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = UserSplitExpenseSerializer
    queryset = UserSplitExpense.objects.all()

class ActivityViewSet(viewsets.ModelViewSet):
    serializer_class = ActivitySerializer
    queryset = Activity.objects.all()

class AddUserToGroup(APIView):
    def post(self, request, *args, **kwargs):
        group = get_object_or_404(Group, id=kwargs['group_id'])
        user = get_object_or_404(User, id=request.data['user_id'])

        group.users.add(user)
        group.save()

        return Response(GroupExpandedSerializer(group).data)