from rest_framework import serializers

from . import models

class UserSplitExpenseSerializer(serializers.ModelSerializer):
    net_portion_mills = serializers.IntegerField()

    class Meta:
        model = models.UserSplitExpense
        fields = '__all__'

class ExpenseExpandedSerializer(serializers.ModelSerializer):
    user_split_expense_set = UserSplitExpenseSerializer(many=True, read_only=True)
    class Meta:
        model = models.Expense
        fields = '__all__'

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Group
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.User
        fields = '__all__'

class UserExpandedSerializer(serializers.ModelSerializer):
    group_set = GroupSerializer(many=True, read_only=True)
    class Meta:
        model = models.User
        fields = '__all__'

class GroupExpandedSerializer(serializers.ModelSerializer):
    expense_set = ExpenseExpandedSerializer(many=True, read_only=True)
    users = UserSerializer(many=True, read_only=True)
    user_totals = serializers.DictField(child=serializers.IntegerField())
    class Meta:
        model = models.Group
        fields = '__all__'