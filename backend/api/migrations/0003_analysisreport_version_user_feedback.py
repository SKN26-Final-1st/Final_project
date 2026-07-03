from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_analysisreport_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="analysisreport",
            name="version",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="analysisreport",
            name="user_feedback",
            field=models.IntegerField(default=-1),
        ),
    ]
