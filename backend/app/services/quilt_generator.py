import os
import httpx
from PIL import Image
from io import BytesIO
import uuid

QUILT_OUTPUT_DIR = "static/quilts"
TILE_SIZE = 300  # each album cover resized to 300x300

os.makedirs(QUILT_OUTPUT_DIR, exist_ok=True)

async def generate_quilt(albums: list[dict], grid_size: int = 3) -> str:
    """Takes a list of album dicts (with image_url) and returns the saved file path."""
    canvas_size = grid_size * TILE_SIZE
    canvas = Image.new("RGB", (canvas_size, canvas_size), "black")

    async with httpx.AsyncClient(verify=False) as client:
        for i, album in enumerate(albums[: grid_size * grid_size]):
            if not album.get("image_url"):
                continue
            try:
                response = await client.get(album["image_url"])
                img = Image.open(BytesIO(response.content)).convert("RGB")
                img = img.resize((TILE_SIZE, TILE_SIZE))

                row = i // grid_size
                col = i % grid_size
                canvas.paste(img, (col * TILE_SIZE, row * TILE_SIZE))
            except Exception:
                continue  # skip albums with broken art rather than failing the whole quilt

    filename = f"{uuid.uuid4().hex}.png"
    filepath = os.path.join(QUILT_OUTPUT_DIR, filename)
    canvas.save(filepath)
    return filepath