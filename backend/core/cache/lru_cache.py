from __future__ import annotations
from collections import OrderedDict
from typing import Any, Optional

class LRUCache:
    def __init__(self, maxsize: int = 256):
        self._c: OrderedDict = OrderedDict(); self._max = maxsize
    def get(self, key: str) -> Optional[Any]:
        if key not in self._c: return None
        self._c.move_to_end(key); return self._c[key]
    def set(self, key: str, value: Any) -> None:
        if key in self._c: self._c.move_to_end(key)
        self._c[key] = value
        if len(self._c) > self._max: self._c.popitem(last=False)
    def delete(self, key: str) -> None: self._c.pop(key, None)
    @property
    def size(self) -> int: return len(self._c)
