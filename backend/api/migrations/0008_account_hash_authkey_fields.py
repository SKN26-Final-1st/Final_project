import secrets

import api.models
from django.db import migrations, models


def _generate_account_hash():
    return secrets.token_urlsafe(16)[:16]


def _generate_auth_key_value(account_hash):
    prefix = f"sk_live_{account_hash}"
    return prefix + secrets.token_urlsafe(48)[:48 - len(prefix)]


def populate_account_hashes(apps, schema_editor):
    Account = apps.get_model("api", "Account")
    used_hashes = set(
        Account.objects.exclude(account_hash__isnull=True)
        .exclude(account_hash="")
        .values_list("account_hash", flat=True)
    )

    for account in Account.objects.filter(models.Q(account_hash__isnull=True) | models.Q(account_hash="")):
        account_hash = _generate_account_hash()

        while account_hash in used_hashes:
            account_hash = _generate_account_hash()

        used_hashes.add(account_hash)
        account.account_hash = account_hash
        account.save(update_fields=["account_hash"])


def populate_auth_key_values(apps, schema_editor):
    AuthKey = apps.get_model("api", "AuthKey")
    used_values = set(AuthKey.objects.values_list("value", flat=True))

    for auth_key in AuthKey.objects.select_related("account").all():
        value = _generate_auth_key_value(auth_key.account.account_hash)

        while value in used_values:
            value = _generate_auth_key_value(auth_key.account.account_hash)

        used_values.add(value)
        auth_key.value = value
        auth_key.save(update_fields=["value"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_delete_block"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="account_hash",
            field=models.CharField(blank=True, max_length=16, null=True),
        ),
        migrations.AddField(
            model_name="authkey",
            name="credit_limit",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="authkey",
            name="name",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.RunPython(populate_account_hashes, migrations.RunPython.noop),
        migrations.RunPython(populate_auth_key_values, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="account",
            name="account_hash",
            field=models.CharField(default=api.models.generate_account_hash, max_length=16, unique=True),
        ),
        migrations.AlterField(
            model_name="authkey",
            name="value",
            field=models.CharField(max_length=48, unique=True),
        ),
    ]
