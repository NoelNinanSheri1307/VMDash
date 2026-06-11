import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class ProxmoxAPI:
    def __init__(self, host, username, password, verify_ssl=False):
        self.host = host.rstrip("/")
        self.username = username
        self.password = password
        self.verify_ssl = verify_ssl
        self.ticket = None
        self.csrf = None
        self.session = requests.Session()

    def login(self):
        url = f"{self.host}/api2/json/access/ticket"
        payload = {"username": self.username, "password": self.password}
        r = self.session.post(url, data=payload, verify=self.verify_ssl, timeout=20)
        r.raise_for_status()

        data = r.json()["data"]
        self.ticket = data["ticket"]
        self.csrf = data["CSRFPreventionToken"]

    def get(self, path, params=None):
        if not self.ticket:
            self.login()

        url = f"{self.host}{path}"
        headers = {"CSRFPreventionToken": self.csrf}
        cookies = {"PVEAuthCookie": self.ticket}

        r = self.session.get(
            url,
            params=params,
            headers=headers,
            cookies=cookies,
            verify=self.verify_ssl,
            timeout=20,
        )

        # ticket expired once
        if r.status_code == 401:
            self.login()
            cookies = {"PVEAuthCookie": self.ticket}
            headers = {"CSRFPreventionToken": self.csrf}
            r = self.session.get(
                url,
                params=params,
                headers=headers,
                cookies=cookies,
                verify=self.verify_ssl,
                timeout=20,
            )

        r.raise_for_status()
        return r.json()["data"]
