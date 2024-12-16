from rest_framework import serializers

from . import models

class UserSplitExpenseSerializer(serializers.ModelSerializer):
    id = serializers.CharField()
    net_portion_mills = serializers.IntegerField()

    class Meta:
        model = models.UserSplitExpense
        fields = '__all__'

class ExpenseExpandedSerializer(serializers.ModelSerializer):
    id = serializers.CharField()
    user_split_expense_set = UserSplitExpenseSerializer(many=True, read_only=True)
    class Meta:
        model = models.Expense
        fields = '__all__'

class GroupSerializer(serializers.ModelSerializer):
    id = serializers.CharField()
    class Meta:
        model = models.Group
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField()
    class Meta:
        model = models.User
        fields = '__all__'

class UserExpandedSerializer(serializers.ModelSerializer):
    id = serializers.CharField()
    group_set = GroupSerializer(many=True, read_only=True)
    class Meta:
        model = models.User
        fields = '__all__'

class GroupExpandedSerializer(serializers.ModelSerializer):
    id = serializers.CharField()
    expense_set = ExpenseExpandedSerializer(many=True, read_only=True)
    users = UserSerializer(many=True, read_only=True)
    user_totals = serializers.DictField(child=serializers.IntegerField())
    class Meta:
        model = models.Group
        fields = '__all__'

class ActivitySerializer(serializers.ModelSerializer):
    id = serializers.CharField()
    class Meta:
        model = models.Activity
        fields = '__all__'