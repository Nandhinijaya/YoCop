import re
import requests
import json

OLLAMA_CHAT_URL = "http://192.168.40.225:11434/api/chat"

def get_urgency_analysis(transcription, emotion):
    try:
        system_prompt = """You are an AI assistant that analyzes transcriptions and emotions to extract specific information and assess urgency.
Don't use previous context or external information.
Please analyze the given transcription and emotion, and return a JSON with the following structure:
{
    "name": "extracted name of the speaker or 'not present'",
    "address": "extracted address or 'not present'",
    "urgency": "high/moderate/low based on content and emotion",
    "corrected_transcription": "grammar-corrected version of transcription"
}
Base the urgency level on:
- High: emergencies, safety issues, time-critical matters
- Moderate: important but not immediate concerns
- Low: general inquiries or minor issues
use double quotes to surround all key and value pairs dont use single quotes
Only respond with the JSON object, no additional text."""

        user_prompt = f"Transcription: {transcription}\nEmotion: {emotion}"
        payload = {
            "model": "deepseek-r1:8b",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "stream": False
        }

        response = requests.post(OLLAMA_CHAT_URL, json=payload)
        
        if response.status_code == 200:
            response_text = response.json().get("message", {}).get("content", "")
            response_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
            response_text_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            
            if response_text_match:
                response_text_cleaned = response_text_match.group(0)
                return json.loads(response_text_cleaned)

            else:
                print("Warning: No JSON object found in response.")
        else:
            print("Error: Non-200 response:", response.status_code, response.text)

    except Exception as e:
        print("Exception in get_urgency_analysis:", str(e))

    # 🔁 Return fallback JSON structure on failure
    return {
        "name": "not present",
        "address": "not present",
        "urgency": "unknown",
        "corrected_transcription": transcription
    }

# Example test call
# print(get_urgency_analysis("What's up Niga? Hi fellow this is Besky from Texas.","Neutral"))
