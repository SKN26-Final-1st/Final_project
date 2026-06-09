# Generated manually to preserve existing Account.password_hash values.

import django.contrib.auth.models
import django.contrib.auth.validators
import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


def populate_usernames(apps, schema_editor):
    Account = apps.get_model("api", "Account")
    for account in Account.objects.all():
        account.username = f"user-{account.pk}"
        account.save(update_fields=["username"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_account_analysisreport_companyinfo_interviewquestion_and_more"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.AlterModelManagers(
            name="account",
            managers=[
                ("objects", django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.RenameField(
            model_name="account",
            old_name="password_hash",
            new_name="password",
        ),
        migrations.AlterField(
            model_name="account",
            name="id",
            field=models.BigAutoField(
                auto_created=True,
                primary_key=True,
                serialize=False,
                verbose_name="ID",
            ),
        ),
        migrations.AlterField(
            model_name="account",
            name="password",
            field=models.CharField(max_length=128, verbose_name="password"),
        ),
        migrations.AddField(
            model_name="account",
            name="date_joined",
            field=models.DateTimeField(
                default=django.utils.timezone.now,
                verbose_name="date joined",
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="first_name",
            field=models.CharField(blank=True, max_length=150, verbose_name="first name"),
        ),
        migrations.AddField(
            model_name="account",
            name="groups",
            field=models.ManyToManyField(
                blank=True,
                help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.",
                related_name="user_set",
                related_query_name="user",
                to="auth.group",
                verbose_name="groups",
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="is_active",
            field=models.BooleanField(
                default=True,
                help_text="Designates whether this user should be treated as active. Unselect this instead of deleting accounts.",
                verbose_name="active",
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="is_staff",
            field=models.BooleanField(
                default=False,
                help_text="Designates whether the user can log into this admin site.",
                verbose_name="staff status",
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="is_superuser",
            field=models.BooleanField(
                default=False,
                help_text="Designates that this user has all permissions without explicitly assigning them.",
                verbose_name="superuser status",
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="last_login",
            field=models.DateTimeField(blank=True, null=True, verbose_name="last login"),
        ),
        migrations.AddField(
            model_name="account",
            name="last_name",
            field=models.CharField(blank=True, max_length=150, verbose_name="last name"),
        ),
        migrations.AddField(
            model_name="account",
            name="user_permissions",
            field=models.ManyToManyField(
                blank=True,
                help_text="Specific permissions for this user.",
                related_name="user_set",
                related_query_name="user",
                to="auth.permission",
                verbose_name="user permissions",
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="username",
            field=models.CharField(blank=True, max_length=150, null=True, verbose_name="username"),
        ),
        migrations.RunPython(populate_usernames, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="account",
            name="email",
            field=models.EmailField(blank=True, max_length=254, verbose_name="email address"),
        ),
        migrations.AlterField(
            model_name="account",
            name="username",
            field=models.CharField(
                error_messages={"unique": "A user with that username already exists."},
                help_text="Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.",
                max_length=150,
                unique=True,
                validators=[django.contrib.auth.validators.UnicodeUsernameValidator()],
                verbose_name="username",
            ),
        ),
        migrations.AlterField(
            model_name="companyinfo",
            name="user",
            field=models.OneToOneField(
                db_column="user_id",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="company_info",
                to="api.account",
            ),
        ),
    ]
