import os
import contextlib
from dotenv import load_dotenv
import psycopg2
from psycopg2.pool import ThreadedConnectionPool

load_dotenv()

raw_url = os.getenv("DATABASE_URL")

# Normalize DATABASE_URL if it has a malformed prefix (e.g. starts with '/postgres:')
db_url = raw_url
if db_url and db_url.startswith("/postgres:"):
    db_url = "postgresql://postgres:" + db_url[len("/postgres:"):]
elif db_url and db_url.startswith("postgres://"):
    db_url = "postgresql://" + db_url[len("postgres://"):]

# Initialize a ThreadedConnectionPool for thread-safe concurrent database access
# We set minconn=1 and maxconn=20
try:
    pool = ThreadedConnectionPool(1, 20, dsn=db_url)
    print("Database connection pool initialized successfully.")
except Exception as e:
    print(f"Failed to initialize database connection pool: {e}")
    pool = None

@contextlib.contextmanager
def get_db_conn():
    """
    Context manager to obtain a database connection from the pool.
    Usage:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(...)
    """
    if pool is None:
        raise RuntimeError("Database connection pool is not initialized.")
    
    conn = pool.getconn()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    else:
        conn.commit()
    finally:
        pool.putconn(conn)

def get_db():
    """
    FastAPI dependency for yielding database connections.
    """
    with get_db_conn() as conn:
        yield conn
