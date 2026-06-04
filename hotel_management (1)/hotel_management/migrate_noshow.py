from database import engine
from sqlalchemy import text

conn = engine.connect()
conn.execute(text("ALTER TABLE bookings MODIFY COLUMN status ENUM('pending','confirmed','checked_in','checked_out','cancelled','no_show') DEFAULT 'pending'"))
conn.commit()
print("Migration OK: Added no_show to status enum")
conn.close()
