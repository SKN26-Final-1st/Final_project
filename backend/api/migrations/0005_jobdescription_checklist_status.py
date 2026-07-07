from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_analysisreport_review_text_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="jobdescription",
            name="checklist_status",
            field=models.CharField(
                choices=[
                    ("onqueue", "On queue"),
                    ("processing", "Processing"),
                    ("done", "Done"),
                    ("fail", "Fail"),
                ],
                default="done",
                max_length=30,
            ),
        ),
    ]
