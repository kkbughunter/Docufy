```bash
netstat -ano | findstr :8000
taskkill /PID 20632 /F
```
```bash
copy .env.example .env 
python -m venv .venv
.venv\Scripts\activate # or .\.venv\Scripts\activate
pip -m pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload
```

```bash
npm install 
```
```bash
npm run dev         
```