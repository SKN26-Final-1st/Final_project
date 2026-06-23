import django.utils.timezone

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="analysisreport",
            name="status",
            field=models.CharField(
                choices=[
                    ("onqueue", "On queue"),
                    ("processing", "Processing"),
                    ("done", "Done"),
                ],
                default="onqueue",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="analysisreport",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.RemoveField(
            model_name="resume",
            name="status",
        ),
    ]
