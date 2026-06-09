from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_update_api_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="subscribe",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="account",
            name="subscribe_expiration",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
