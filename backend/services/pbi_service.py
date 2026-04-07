import os
import requests
import json
from flask import current_app

class PowerBIService:
    def __init__(self):
        self.authority_url = "https://login.microsoftonline.com/"
        self.scope = ["https://analysis.windows.net/powerbi/api/.default"]
        self.url_groups = "https://api.powerbi.com/v1.0/myorg/groups"
        
        # Load config
        self.tenant_id = os.environ.get("PBI_TENANT_ID")
        self.client_id = os.environ.get("PBI_CLIENT_ID")
        self.client_secret = os.environ.get("PBI_CLIENT_SECRET")
        self.workspace_id = os.environ.get("PBI_WORKSPACE_ID")
        self.report_id = os.environ.get("PBI_REPORT_ID")

    def get_access_token(self):
        """
        Obtiene el token de acceso de Azure AD (Service Principal)
        """
        if not all([self.tenant_id, self.client_id, self.client_secret]):
            # Mock for development if creds are missing
            return "mock_access_token"

        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": " ".join(self.scope)
        }
        
        response = requests.post(f"{self.authority_url}{self.tenant_id}/oauth2/v2.0/token", data=data)
        response.raise_for_status()
        return response.json().get("access_token")

    def get_embed_params_for_single_report(self, business_id):
        """
        Genera el EmbedToken con RLS aplicado para el business_id
        """
        if not all([self.workspace_id, self.report_id]):
             # Return mock data for frontend testing
            return {
                "type": "report",
                "id": "mock_report_id",
                "embedUrl": "https://app.powerbi.com/reportEmbed?reportId=mock&groupId=mock",
                "accessToken": "mock_embed_token",
                "tokenId": "mock_token_id",
                "expiry": "2099-12-31T23:59:59Z"
            }

        access_token = self.get_access_token()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }

        # 1. Get Report Details (Embed URL)
        report_url = f"{self.url_groups}/{self.workspace_id}/reports/{self.report_id}"
        report_res = requests.get(report_url, headers=headers)
        report_res.raise_for_status()
        report_json = report_res.json()

        # 2. Generate Embed Token with RLS
        # RLS: Row Level Security. We map 'Business' role to 'business_id'
        token_url = f"{self.url_groups}/{self.workspace_id}/reports/{self.report_id}/GenerateToken"
        
        payload = {
            "accessLevel": "View",
            "identities": [
                {
                    "username": str(business_id),
                    "roles": ["Business"],
                    "datasets": [report_json.get("datasetId")]
                }
            ]
        }
        
        token_res = requests.post(token_url, headers=headers, json=payload)
        token_res.raise_for_status()
        token_json = token_res.json()

        return {
            "type": "report",
            "id": report_json.get("id"),
            "embedUrl": report_json.get("embedUrl"),
            "accessToken": token_json.get("token"),
            "tokenId": token_json.get("tokenId"),
            "expiry": token_json.get("expiration")
        }

pbi_service = PowerBIService()
