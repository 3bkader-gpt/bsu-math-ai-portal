import logging
from collections import deque
from datetime import datetime
from typing import List, Dict, Any, Optional
import threading

class InMemoryLogHandler(logging.Handler):
    """
    Thread-safe in-memory ring buffer that captures system logs
    for real-time diagnostic reporting and admin panel monitoring.
    """
    def __init__(self, capacity: int = 350):
        super().__init__()
        self.capacity = capacity
        self.buffer: deque = deque(maxlen=capacity)
        self.lock = threading.Lock()

    def emit(self, record: logging.LogRecord):
        try:
            msg = self.format(record) if self.formatter else record.getMessage()
            entry = {
                "timestamp": datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S"),
                "epoch": record.created,
                "level": record.levelname,
                "logger": record.name,
                "message": msg,
            }
            if record.exc_info:
                entry["exception"] = logging.Formatter().formatException(record.exc_info)
            with self.lock:
                self.buffer.append(entry)
        except Exception:
            self.handleError(record)

    def get_logs(self, limit: int = 150, level: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.lock:
            entries = list(self.buffer)
        
        if level and level.upper() != "ALL":
            entries = [e for e in entries if e["level"].upper() == level.upper()]
            
        if search:
            s = search.lower()
            entries = [e for e in entries if s in e["message"].lower() or s in e["logger"].lower()]

        return entries[-limit:]

    def get_stats(self) -> Dict[str, int]:
        with self.lock:
            entries = list(self.buffer)
        stats = {"total": len(entries), "INFO": 0, "WARNING": 0, "ERROR": 0, "DEBUG": 0}
        for e in entries:
            lvl = e.get("level", "INFO")
            if lvl in stats:
                stats[lvl] += 1
            else:
                stats[lvl] = 1
        return stats

    def clear(self):
        with self.lock:
            self.buffer.clear()

# Global Singleton Handler
log_handler = InMemoryLogHandler(capacity=400)
log_handler.setFormatter(logging.Formatter("%(message)s"))

def setup_global_logging():
    """
    Attaches the in-memory log buffer to the root logger and core application loggers.
    """
    root_logger = logging.getLogger()
    if log_handler not in root_logger.handlers:
        root_logger.addHandler(log_handler)
    
    # Also attach to specific app loggers for visibility
    for name in ["app", "uvicorn", "uvicorn.error", "uvicorn.access", "DiagnosticsRouter", "StreamRouter", "TelegramStorage"]:
        lg = logging.getLogger(name)
        if log_handler not in lg.handlers:
            lg.addHandler(log_handler)

    logger = logging.getLogger("SystemLogger")
    logger.info("In-Memory System Logs Buffer initialized successfully.")

# Initialize upon import
setup_global_logging()
