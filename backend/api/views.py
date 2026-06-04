from django.http import JsonResponse
from openai import OpenAI
import os

def chat_test(request):
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY")
    )

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "user", "content": "안녕"}
        ]
    )

    return JsonResponse({
        "answer": response.choices[0].message.content
    })