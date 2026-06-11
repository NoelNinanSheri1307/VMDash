FROM mirror-registry.cloud.vssc.dos.gov.in:8443/ubi8/python-312

WORKDIR /app

COPY . .

RUN pip install --index-url http://10.41.10.254/repo/PyPI3.13Repo/web/simple --trusted-host 10.41.10.254 -r requirements.txt

CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]