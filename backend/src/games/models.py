from django.db import models
import json, random, string, os

from django.db import models, transaction
from django_jsonform.models.fields import ArrayField

from rest_framework import exceptions as drf_exceptions
from datetime import datetime, timedelta
from dateutil import parser
import pytz
from django.db.models import Q
from decimal import Decimal

# class BoardManager(models.Manager):
#     def create_board(self, word_list_name="default", *args, **kwargs):

#         if word_list_name != "default":
#             word_list = WordList.objects.filter(name=word_list_name).first()
#             adult = word_list.adult
#             words = word_list.words_array
#         else:
#             word_list = None
#             adult = False
#             words = default_words

#         cards_generated = min(Board.CARDS_GENERATED, len(words) // Board.WORDS_PER_CARD)

#         cards = list(chunks(random.sample(words, k=cards_generated * Board.WORDS_PER_CARD), Board.WORDS_PER_CARD))
#         answer = tuple((
#             (
#                 card_index,
#                 random.randint(0, Board.WORDS_PER_CARD - 1),
#             )
#             for card_index in random.sample(range(cards_generated), k=Board.CARDS_IN_ANSWER)
#         ))
#         board = self.create(cards=cards, answer=answer, adult=adult, word_list=word_list, *args, **kwargs)

#         return board

#     # imports using the Board.export function
#     def import_board(self, board_dict):
#         board_dict['last_updated_time'] = parser.parse(board_dict['last_updated_time'])
#         self.create(**board_dict)

#     def daily(self):
#         la_tz = pytz.timezone('America/Los_Angeles')
#         utc_now = datetime.utcnow()
#         la_now = datetime.utcnow().replace(tzinfo=pytz.utc).astimezone(la_tz)
#         la_day_begin = datetime(la_now.year, la_now.month, la_now.day,  hour=0, minute=0, second=0, microsecond=0).astimezone(la_tz)

#         existing = self.filter(
#             daily_set_time__gte=la_day_begin,
#             adult=False,
#         ).order_by(
#             '-daily_set_time',
#         ).first()

#         if existing is not None:
#             return existing

#         new_daily = self.filter(
#             ~Q(author=""),
#             adult=False,
#         ).filter(
#             daily_set_time__isnull=True,
#         ).order_by(
#             '-last_updated_time',
#         ).first()

#         new_daily.daily_set_time = la_now

#         self.filter(id=new_daily.id).update(daily_set_time=la_now)

#         return new_daily



class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100)

    created_time = models.DateTimeField(auto_now_add=True)
    last_updated_time = models.DateTimeField(auto_now=True)

class Group(models.Model):
    name = models.CharField(max_length=100)
    users = models.ManyToManyField(User)

    created_time = models.DateTimeField(auto_now_add=True)
    last_updated_time = models.DateTimeField(auto_now=True)

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
    
    # TODO(mark): property of last expense update time

class Expense(models.Model):
    name = models.CharField(max_length=200)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    total_mills = models.IntegerField()
    pay_json = models.JSONField(null=True) # same format as split_json
    split_json = models.JSONField()

    created_time = models.DateTimeField(auto_now_add=True)
    last_updated_time = models.DateTimeField(auto_now=True)

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
            # TODO
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

    def update_user_splits(self, pay_json, split_json):
        previous_user_split_expenses = {user_split.user.id: user_split for user_split in self.user_split_expense_set.all()}
        user_pay_splits = self.calculate_split(self.total_mills, pay_json, self.id)
        user_owe_splits = self.calculate_split(self.total_mills, split_json, self.id)

        # TODO(mark): put all these in transaction
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

# class Board(models.Model):
#     WORDS_PER_CARD = 4
#     CARDS_IN_ANSWER = 4
#     CARDS_GENERATED = 20

#     objects = BoardManager()

#     # game = models.ForeignKey(Game, on_delete=models.CASCADE)
#     created_time = models.DateTimeField(auto_now_add=True)
#     last_updated_time = models.DateTimeField(auto_now=True)
#     clues = ArrayField(
#         models.CharField(max_length=20, blank=True),
#         size=CARDS_IN_ANSWER,
#         null=True,
#     )
#     cards = ArrayField(
#         ArrayField(
#             models.CharField(max_length=20),
#             size=WORDS_PER_CARD,
#         ),
#         size=CARDS_GENERATED,
#     )

#     # ( (card_index, word_rotation_offset), ... )
#     # eg ((5, 2), (2, 1), (0, 1), (3, 0))
#     answer = ArrayField(
#         ArrayField(
#             models.IntegerField(),
#             size=2,
#         ),
#         size=CARDS_IN_ANSWER,
#     )

#     suggested_num_cards = models.IntegerField(null=True)
#     author = models.CharField(max_length=50, blank=True)
#     daily_set_time = models.DateTimeField(null=True, blank=True)
#     adult = models.BooleanField(default=False, null=False)
#     word_list = models.ForeignKey('WordList', on_delete=models.SET_NULL, null=True)

#     @property
#     def answer_cards(self):
#         return tuple((
#             self.cards[card_index][word_rotation_offset:] + self.cards[card_index][:word_rotation_offset]
#             for (card_index, word_rotation_offset) in self.answer
#         ))

#     @property
#     def suggested_possible_cards(self):
#         if self.suggested_num_cards is None:
#             return None
#         return self.possible_cards(self.suggested_num_cards)

#     def possible_cards(self, n):
#         answer_cards = tuple((
#             tuple(self.cards[card_index]) for (card_index, _) in self.answer
#         ))
#         answer_cards_set = set(answer_cards)
#         non_answer_cards = tuple((
#             tuple(x) for x in self.cards if tuple(x) not in answer_cards
#         ))

#         num_non_answer_cards = min(
#             max(
#                 n - len(answer_cards),
#                 0,
#             ),
#             len(self.cards) - len(answer_cards),
#         )

#         return tuple(sorted(
#             tuple(answer_cards + non_answer_cards[0:num_non_answer_cards]),
#             key = lambda x: hash(tuple(x)),
#         ))

#     @property
#     def answer_from_suggested_cards(self):
#         if self.suggested_num_cards is None:
#             return None
#         return self.answer_from_possible_cards(self.suggested_num_cards)

#     def answer_from_possible_cards(self, n):
#         possible_cards = self.possible_cards(n)

#         return [
#             [possible_cards.index(tuple(self.cards[ans[0]])), ans[1]]
#             for ans in self.answer
#         ]

#     def __str__(self):
#         return '%s\'s game %d with clues: %s and answer: %s' % (self.author, self.id, str(self.clues), str(self.answer_cards))

#     def check_guess(self, guess_answers, n=None):
#         if n is None:
#             n = self.suggested_num_cards
#         answer = self.answer_from_possible_cards(n)

#         resp = []
#         for i in range(len(answer)):
#             cur = None
#             if i >= len(guess_answers):
#                 cur = 0
#             elif tuple(answer[i]) == tuple(guess_answers[i]):
#                 cur = 1
#             elif answer[i][0] == guess_answers[i][0]:
#                 cur = 2
#             else:
#                 cur = 0
#             resp.append(cur)
#         return resp

#     def export(self):
#         board_dict = {
#             'last_updated_time': self.last_updated_time.isoformat(),
#             'clues': self.clues,
#             'cards': self.cards,
#             'answer': self.answer,
#             'suggested_num_cards': self.suggested_num_cards,
#             'author': self.author,
#             'adult': self.adult,
#         }

#         return board_dict

# class BoardClientStateManager(models.Manager):
#     def get_latest(self, board_id):
#         latest = self.filter(board=board_id, created_time__gte=(datetime.now() - timedelta(minutes=2))).order_by('-id').first()

#         # example
#         # 'previousGuesses': [
#         #    [[[2, 0], [3, 2], [0, 0], [4, 2]], [1, 2, 1, 1]],
#         #    [[[2, 0], [3, 3], [0, 0], [4, 2]], [1, 1, 1, 1]]
#         # ]
#         # if latest is not None and 'previousGuesses' in latest.data:
#         #     done = any([
#         #         all([card_info == 1 for card_info in response])
#         #         for guess, response in latest.data['previousGuesses']
#         #     ])
#         #     if done:
#         #         return None

#         return latest

# class BoardClientState(models.Model):
#     objects = BoardClientStateManager()

#     board = models.ForeignKey(Board, on_delete=models.CASCADE)
#     created_time = models.DateTimeField(auto_now_add=True)
#     data = models.JSONField()
#     client_id = models.CharField(max_length=50)

# class BoardGuess(models.Model):
#     board = models.ForeignKey(Board, on_delete=models.CASCADE)
#     created_time = models.DateTimeField(auto_now_add=True)
#     data = models.JSONField()
#     client_id = models.CharField(max_length=50, blank=True)

# class WordList(models.Model):
#     name = models.CharField(max_length=40, blank=False, unique=True)
#     words = models.TextField(blank=True)
#     created_time = models.DateTimeField(auto_now_add=True)
#     last_updated_time = models.DateTimeField(auto_now=True)
#     adult = models.BooleanField(default=False)

#     @property
#     def words_array(self):
#         return [w for w in self.words.replace('\r', '').split('\n') if w != '']

#     def __str__(self):
#         return '%s WordList (id=%d) including %s' % (self.name, self.id, str(self.words_array[0:3]))

