# -*- coding: utf-8 -*-
# Generated by Django 1.11.1 on 2017-06-04 17:04
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance_portal', '0004_professor'),
    ]

    operations = [
        migrations.CreateModel(
            name='Session',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('auth_token', models.CharField(default=None, max_length=200, unique=True)),
                ('user_id', models.IntegerField(default=0)),
                ('user_type', models.CharField(default=None, max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('is_open', models.BooleanField(default=False)),
            ],
        ),
    ]