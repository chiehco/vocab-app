"""Resolve published source references without recording personal home paths."""
import os
from pathlib import Path

SOURCE_PREFIX = "source-art/LV1/"

def source_root():
    return Path(os.environ.get("LV1_SOURCE_ART_ROOT", Path.home()/".codex/generated_images/LV1"))

def resolve_source(value):
    text = str(value).replace("\\", "/")
    return source_root()/text[len(SOURCE_PREFIX):] if text.startswith(SOURCE_PREFIX) else Path(value)

def source_reference(path):
    return SOURCE_PREFIX + Path(path).relative_to(source_root()).as_posix()
